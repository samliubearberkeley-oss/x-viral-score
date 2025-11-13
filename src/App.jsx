import { useState } from 'react';
import ResultCard from './components/ResultCard';
import ErrorDialog from './components/ErrorDialog';
import RetroWindow from './components/RetroWindow';
import { insforgeClient } from './lib/insforge';
import './styles/components.css';

function App() {
  const [textContent, setTextContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check file types and sizes
    const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
    if (nonImageFiles.length > 0) {
      setError('Please upload image files only');
      return;
    }

    // Check file sizes (max 5MB per image)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Image too large: ${oversizedFiles[0].name}. Max size is 5MB`);
      return;
    }

    // Just store files for later upload (when Analyze is clicked)
    setImageFiles(prev => [...prev, ...files]);
    setError('');
    console.log(`Selected ${files.length} image(s) (will upload when Analyze is clicked)`);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    // Check if we have text or images (at least one required)
    if (!textContent.trim() && imageFiles.length === 0) {
      setError('Please enter text content or upload images');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');
    setResult(null);

    // Linear progress simulation - smooth and predictable
    let progressInterval = null;
    const startTime = Date.now();
    const estimatedDuration = 15000; // 15 seconds total estimate (includes upload + analysis)
    
    // Start linear progress timer
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min(Math.floor((elapsed / estimatedDuration) * 100), 95); // Cap at 95% until done
      setProgress(progressPercent);
    }, 50); // Update every 50ms for smooth progress

    try {
      // Step 1: Upload images to Insforge if any
      let finalImageUrls = [];
      
      if (imageFiles.length > 0) {
        console.log(`📤 Uploading ${imageFiles.length} image(s) to Insforge...`);
        setUploadingImages(true);
        setProgress(10);
        
        const uploadedUrls = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          console.log(`Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          
          const fileName = `${Date.now()}-${i}-${file.name}`;
          const { data, error: uploadError } = await insforgeClient.storage
            .from('images')
            .upload(fileName, file);

          if (uploadError) {
            console.error(`Error uploading ${file.name}:`, uploadError);
            
            // Check for authentication errors
            if (uploadError.statusCode === 401 || uploadError.error === 'AUTH_INVALID_CREDENTIALS' || uploadError.message?.includes('Invalid token')) {
              setError(`Failed to upload ${file.name}: Authentication failed`);
              setUploadingImages(false);
              if (progressInterval) {
                clearInterval(progressInterval);
              }
              setLoading(false);
              return;
            }
            
            setError(`Failed to upload: ${file.name}. ${uploadError.message || uploadError.error || ''}`);
            continue;
          }

          if (data?.url) {
            uploadedUrls.push(data.url);
            console.log(`✅ Uploaded: ${file.name} -> ${data.url}`);
          }
        }

        finalImageUrls = uploadedUrls;
        setImageUrls(finalImageUrls);
        setUploadingImages(false);
        console.log(`✅ All images uploaded. Total: ${finalImageUrls.length}`);
      }

      setProgress(30);

      // Step 2: Call Edge Function with text and/or image URLs
      // NOTE: Edge Function will create database record FIRST, then analyze
      console.log(`📡 Calling Edge Function...`);
      console.log(`  Text: ${textContent.trim() ? `${textContent.trim().length} characters` : 'none'}`);
      console.log(`  Images: ${finalImageUrls.length}`);
      console.log(`  ⚠️ Database record should be created IMMEDIATELY when this function is called`);
      
      const { data, error: invokeError } = await insforgeClient.functions.invoke('score', {
        body: { 
          text: textContent.trim() || '', // Send empty string if no text
          imageUrls: finalImageUrls
        },
      });

      // Clear progress interval and complete to 100%
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setProgress(100);

      if (invokeError) {
        // Preserve error details for better error handling
        let errorMessage = invokeError.message || invokeError.error || 'Analysis failed';
        
        // If error is an object, try to extract message
        if (typeof invokeError.error === 'object' && invokeError.error !== null) {
          errorMessage = invokeError.error.error || invokeError.error.message || errorMessage;
        }
        
        const error = new Error(errorMessage);
        error.statusCode = invokeError.statusCode;
        error.error = invokeError.error;
        error.details = invokeError.details;
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from analysis');
      }

      // Log database save status and ensure user knows data is saved
      if (data.analysis_id) {
        const analysisId = data.analysis_id;
        console.log('✅ Database record created!');
        console.log('✅ Analysis ID:', analysisId);
        console.log('✅ Record was created IMMEDIATELY when Analyze was clicked');
        console.log('✅ Analysis results were then updated in the same record');
        console.log('📊 Record includes:', {
          id: analysisId,
          text_content: data.text_content ? `${data.text_content.length} chars` : 'none',
          image_urls: data.image_urls?.length || 0,
          overall_score: data.overall_score,
          predicted_reach: data.predicted_reach
        });
        
        // Add success message to result for UI display
        if (!data.db_save_message) {
          data.db_save_message = `✅ Record created (ID: ${analysisId})`;
        }
        data.db_saved = true;
      } else if (data.db_save_error || data.error) {
        // Check if it's a permission error
        const errorCode = data.db_save_error?.code || data.code;
        const errorDetails = data.db_save_error || data;
        
        console.error('⚠️ Database operation failed!');
        console.error('Error details:', JSON.stringify(errorDetails, null, 2));
        console.error('Error code:', errorCode);
        console.error('Error message:', errorDetails.message || data.error);
        
        let dbErrorMsg = '';
        if (errorCode === '42501') {
          // Permission denied - RLS policy issue
          dbErrorMsg = '⚠️ Permission denied: Cannot save to database. ';
          if (data.troubleshooting) {
            dbErrorMsg += `Solution: ${data.troubleshooting.solution}`;
          } else {
            dbErrorMsg += 'Please set SERVICE_ROLE_KEY in Edge Function environment variables.';
          }
          console.error('🔧 Troubleshooting:', data.troubleshooting || 'Set SERVICE_ROLE_KEY environment variable');
        } else {
          dbErrorMsg = `⚠️ Database operation failed: ${errorDetails.message || data.error || 'Unknown error'}`;
        }
        
        console.warn(dbErrorMsg);
        
        // Set error but allow result to still be displayed if analysis succeeded
        if (data.overall_score) {
          // Analysis succeeded, just warn about DB
          setError(dbErrorMsg);
        } else {
          // Analysis failed, show error
          throw new Error(dbErrorMsg);
        }
        
        // Add error info to result for debugging
        data.db_save_message = dbErrorMsg;
      } else {
        console.warn('⚠️ No database save status in response');
        console.warn('⚠️ Check Edge Function logs to verify if data was saved');
        data.db_save_message = '⚠️ Database save status unknown - check logs';
      }

      setResult(data);
    } catch (err) {
      // Provide more detailed error messages
      let errorMessage = 'Analysis failed. Please try again.';
      
      // Extract error message from different error formats
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        // Handle nested error objects
        if (typeof err.error === 'object' && err.error !== null) {
          errorMessage = err.error.error || err.error.message || JSON.stringify(err.error);
        } else {
          errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
        }
      } else if (err.details) {
        errorMessage = err.details;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // If error message contains JSON, try to parse it
      if (errorMessage.includes('{') && errorMessage.includes('}')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error) {
            errorMessage = parsed.error;
            if (parsed.details) {
              errorMessage += `: ${parsed.details}`;
            }
          }
        } catch (e) {
          // Not JSON, continue with original message
        }
      }
      
      // Check for authentication errors (multiple patterns)
      const authErrorPatterns = [
        '401',
        'Unauthorized',
        'Invalid token',
        'AUTH_INVALID_CREDENTIALS',
        'token',
        'authentication',
        'credential'
      ];
      
      const isAuthError = authErrorPatterns.some(pattern => 
        errorMessage.toLowerCase().includes(pattern.toLowerCase())
      ) || (err.statusCode === 401) || (err.error === 'AUTH_INVALID_CREDENTIALS');
      
      if (isAuthError) {
        errorMessage = 'Authentication required. Please ensure you are logged in or contact support.';
      }
      
      setError(errorMessage);
      console.error('Error analyzing content:', err);
    } finally {
      // Clear any running progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setLoading(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'transparent', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: '672px' }}>
        {/* Main Window */}
        <RetroWindow title="X Viral Score" className="w-full" headerColor="yellow">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Content */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--color-ink)' }}>Will Your X Post Go Viral?</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-ink)' }}>
                Upload text and images to see your score.
              </p>
            </div>

            {/* Text Input Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>
                1. Enter text
              </label>

              {/* Text Area */}
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your post content here..."
                className="doodle-input"
                disabled={loading}
                style={{ 
                  minHeight: '120px', 
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Image Upload Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 600 }}>
                2. Upload images (optional)
              </label>
              
              <label className="doodle-button" style={{ fontSize: '13px', cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                🖼️ Choose images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Image Preview */}
              {imageFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-ink)', opacity: 0.7, fontWeight: 600 }}>
                    📸 {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected (will upload on Analyze)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                    {imageFiles.map((file, index) => (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ position: 'relative', border: '2px solid var(--color-ink)', borderRadius: '4px', overflow: 'hidden', aspectRatio: '1' }}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            onClick={() => removeImage(index)}
                            disabled={loading}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'var(--color-danger)',
                              border: '2px solid var(--color-ink)',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: 'var(--color-ink)',
                              opacity: loading ? 0.5 : 1
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-ink)', opacity: 0.6, textAlign: 'center', wordBreak: 'break-all' }}>
                          {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-ink)', opacity: 0.5, textAlign: 'center' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleAnalyze}
                disabled={loading || (!textContent.trim() && imageFiles.length === 0) || uploadingImages}
                className="doodle-button"
                style={{ fontSize: '13px' }}
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
              
              {/* Progress Bar */}
              {loading && (
                <div style={{ width: '100%', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="doodle-progress">
                    <div 
                      className="doodle-progress-bar"
                      style={{ 
                        width: `${progress}%`,
                        transition: 'width 0.3s ease-out',
                        animation: 'none'
                      }}
                    ></div>
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--color-ink)', 
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    {progress < 20 && (imageFiles.length > 0 ? 'Uploading images...' : 'Preparing analysis...')}
                    {progress >= 20 && progress < 50 && 'Sending request...'}
                    {progress >= 50 && progress < 80 && 'AI analyzing content...'}
                    {progress >= 80 && progress < 100 && 'Processing results...'}
                    {progress === 100 && 'Complete!'}
                    <span style={{ marginLeft: '8px', opacity: 0.7 }}>{progress}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <ErrorDialog
                message={error}
                onClose={() => setError('')}
              />
            )}

            {/* Result Card */}
            {result && (
              <ResultCard
                overall_score={result.overall_score}
                predicted_reach={result.predicted_reach}
                factors={result.factors}
                short_explanation={result.short_explanation}
                detailed_reasons={result.detailed_reasons}
                improvement_suggestions={result.improvement_suggestions}
              />
            )}
          </div>
        </RetroWindow>
      </div>
      
      {/* Footer */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--color-ink)',
        opacity: 0.7,
        zIndex: 1000,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: 'calc(100vw - 32px)',
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid var(--color-ink)',
        borderRadius: '4px',
        boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.1)',
        transition: 'opacity 0.2s, transform 0.12s ease-out',
        fontFamily: 'inherit'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translate(-1px, -1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.transform = 'translate(0, 0)';
      }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>Made by</span>
        <a 
          href="https://www.linkedin.com/in/sam-liu-025b871a2/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: 'var(--color-ink)',
            textDecoration: 'underline',
            fontWeight: 600,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.8'}
        >
          Sam Liu
        </a>
        <span style={{ opacity: 0.5 }}>•</span>
        <span style={{ whiteSpace: 'nowrap' }}>Powered by</span>
        <a 
          href="https://insforge.dev/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-ink)',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          <img 
            src="/insforge-logo.png" 
            alt="Insforge" 
            style={{
              height: '16px',
              width: 'auto',
              display: 'block'
            }}
          />
          <span>Insforge</span>
        </a>
      </div>
    </div>
  );
}

export default App;
