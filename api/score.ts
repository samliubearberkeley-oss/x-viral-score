// Insforge Edge Function for analyzing X (Twitter) post virality from uploaded content
// createClient is globally available, no import needed

module.exports = async function(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const { text, imageUrls } = body;

    // Validate input - need at least text or images
    const tweetText = (text && typeof text === 'string') ? text.trim() : '';
    const images = Array.isArray(imageUrls) ? imageUrls : [];
    
    if (!tweetText && images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Please provide text content or images (or both)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Analyzing post content...');
    console.log(`  Text length: ${tweetText.length}`);
    console.log(`  Images: ${images.length}`);

    // Build AI prompt (optimized for speed)
    const systemPrompt = `You are an X (Twitter) virality analyst. Analyze text and visual content to predict viral potential.

**Key Factors:**
- Text: content, tone, structure, topic
- Visuals: composition, quality, emotional impact, relevance
- Context: current X trends, audience appeal

${images.length > 0 ? '**CRITICAL**: Images provided - analyze visuals carefully and score media_boost > 0 based on quality.' : ''}`;

    const userPrompt = `Analyze this post:

${tweetText ? `**Text:**\n${tweetText}\n` : '**Text:** None (image-only post)\n'}
${images.length > 0 ? `**Images:** ${images.length} image(s) provided (analyze carefully)` : '**Images:** None'}

Return ONLY JSON in this schema:
{
  "overall_score": number,           // 0-100
  "predicted_reach": "Low" | "Medium" | "High" | "Explosive",
  "factors": {
    "hook_strength": number,        // 0-100
    "clarity_and_structure": number,
    "emotional_intensity": number,
    "controversy_polarization": number,
    "novelty_originality": number,
    "shareability": number,
    "format_fit_for_x": number,     // line breaks, length, thread vs single, etc.
    "media_boost": number,          // CRITICAL: If images are present, this MUST be > 0. Score 0-100 based on visual quality, composition, relevance to text, emotional impact, and attention-grabbing power. If no images, this should be 0. If images exist, minimum score should be 20-30 for basic images, 50-70 for good quality, 80+ for exceptional visuals.
    "author_leverage": number,      // perceived audience size / influence
    "trend_alignment": number       // how much it seems to sit on top of current topics
  },
  "short_explanation": string,      // 1-2 sentences summary (mention visual elements if impactful)
  "detailed_reasons": string[],     // EXACTLY 3-4 most important bullet points only (prioritize: visual impact, engagement hooks, content quality, shareability)
  "improvement_suggestions": string[] // EXACTLY 3 most actionable and impactful suggestions (prioritize: visual additions, engagement tactics, content improvements)
}

**Rules:**
- Score 0-100: most posts 20-70, 80+ = viral potential
- ${images.length > 0 ? `media_boost MUST be > 0 (min 20-30 basic, 50-70 good, 80+ exceptional)` : `media_boost = 0 (no images)`}
- detailed_reasons: Top 3-4 impactful points only${images.length > 0 ? ' (include visual impact)' : ''}
- improvement_suggestions: Top 3 actionable suggestions${images.length > 0 ? ' (include visual if needed)' : ''}
- Output ONLY valid JSON, no markdown blocks or extra text`;

    // Extract token from request headers (if provided)
    // Frontend SDK automatically includes auth token when user is logged in
    const authHeader = request.headers.get('Authorization');
    const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    // Use ACCESS_API_KEY as fallback for internal function calls
    // This allows Edge Functions to work even without user authentication
    // Fallback to hardcoded key if env var not set
    const accessApiKey = Deno.env.get('ACCESS_API_KEY') || 'ik_4e49ca2fd1554c8a5adcbbcd5dfc78e6';
    
    // Try to get SERVICE_ROLE_KEY for database operations (bypasses RLS)
    // SERVICE_ROLE_KEY has full database access and can bypass RLS policies
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // CRITICAL: For database operations with anonymous users (user_id = null),
    // we need to use SERVICE_ROLE_KEY to bypass RLS restrictions
    // For authenticated users, use userToken so RLS policies work correctly
    // RLS policies check auth.uid() which only works with user tokens
    // But anonymous inserts (user_id = null) need service-level access (SERVICE_ROLE_KEY)
    // For AI operations, use ACCESS_API_KEY or userToken
    const dbToken = userToken || serviceRoleKey || accessApiKey;  // Prefer service role key for DB operations
    const aiToken = userToken || accessApiKey;
    
    console.log('Authentication:', {
      hasUserToken: !!userToken,
      hasAccessApiKey: !!accessApiKey,
      hasServiceRoleKey: !!serviceRoleKey,
      usingDbToken: !!dbToken,
      tokenType: userToken ? 'user_token' : (serviceRoleKey ? 'service_role_key' : (accessApiKey ? 'access_api_key' : 'none')),
      willSaveAsAnonymous: !userToken
    });
    
    // Warn if no service role key for anonymous users
    if (!userToken && !serviceRoleKey) {
      console.warn('⚠️ WARNING: No SERVICE_ROLE_KEY found. Anonymous database operations may fail due to RLS policies.');
      console.warn('⚠️ Set SERVICE_ROLE_KEY environment variable in Edge Function to allow anonymous inserts.');
    }
    
    // Create Insforge client for AI and database operations
    // Use BACKEND_INTERNAL_URL environment variable for internal Docker communication
    // IMPORTANT: 
    // - If userToken exists: use it for RLS (user can only see their own data)
    // - If no userToken: use ACCESS_API_KEY for service-level access (allows anonymous inserts)
    const client = createClient({
      baseUrl: Deno.env.get('BACKEND_INTERNAL_URL') || 'http://insforge:7130',
      edgeFunctionToken: dbToken || null  // Prefer user token for RLS, fallback to service key for anonymous
    });
    
    console.log('Client created:', {
      baseUrl: Deno.env.get('BACKEND_INTERNAL_URL') || 'http://insforge:7130',
      hasToken: !!dbToken,
      tokenType: userToken ? 'user_token' : (accessApiKey ? 'service_key' : 'none')
    });

    // Get current user (if authenticated) - needed for database record
    let userId = null;
    try {
      const { data: userData } = await client.auth.getCurrentUser();
      if (userData?.user?.id) {
        userId = userData.user.id;
      }
    } catch (authError) {
      // User not authenticated, continue with anonymous analysis
      console.log('Anonymous analysis - no user ID');
    }

    // STEP 1: Create database record FIRST (before analysis)
    // CRITICAL: This must succeed - record should be created immediately when Analyze is clicked
    let analysisId = null;
    try {
      console.log('💾 STEP 1: Creating database record IMMEDIATELY...');
      console.log('User ID:', userId || 'null (anonymous)');
      console.log('Text content:', tweetText ? `${tweetText.length} characters` : 'empty');
      console.log('Image URLs count:', images.length);
      console.log('Using token:', dbToken ? `${dbToken.substring(0, 20)}...` : 'none');
      console.log('Has ACCESS_API_KEY:', !!accessApiKey);
      console.log('Has SERVICE_ROLE_KEY:', !!serviceRoleKey);
      console.log('Token type for DB:', userToken ? 'user_token' : (serviceRoleKey ? 'service_role_key' : (accessApiKey ? 'access_api_key' : 'none')));
      
      // Prepare initial insert data - only user input, no analysis results yet
      const initialData = {
        user_id: userId || null, // null for anonymous users
        text_content: tweetText || null, // Use null if empty, not empty string
        image_urls: images.length > 0 ? images : [], // Empty array if no images
        // Analysis results will be null initially, updated after analysis completes
        overall_score: null,
        predicted_reach: null,
        factors: null,
        short_explanation: null,
        detailed_reasons: [],
        improvement_suggestions: []
      };
      
      console.log('📝 Insert data:', JSON.stringify({
        hasUserId: !!initialData.user_id,
        hasText: !!initialData.text_content,
        textLength: initialData.text_content?.length || 0,
        imageCount: initialData.image_urls.length
      }, null, 2));
      
      console.log('🔄 Inserting into analyses table...');
      const { data: createdRecord, error: createError } = await client.database
        .from('analyses')
        .insert([initialData])
        .select()
        .single();

      if (createError) {
        console.error('❌ CRITICAL: Failed to create database record!');
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error details:', createError.details);
        console.error('Error hint:', createError.hint);
        console.error('Full error object:', JSON.stringify(createError, null, 2));
        console.error('Insert data that failed:', JSON.stringify(initialData, null, 2));
        console.error('Token info:', {
          hasToken: !!dbToken,
          hasUserToken: !!userToken,
          hasServiceRoleKey: !!serviceRoleKey,
          hasAccessApiKey: !!accessApiKey,
          tokenType: userToken ? 'user_token' : (serviceRoleKey ? 'service_role_key' : (accessApiKey ? 'access_api_key' : 'none')),
          tokenPreview: dbToken ? `${dbToken.substring(0, 30)}...` : 'none'
        });
        
        // Provide helpful error message for permission denied
        let errorMessage = 'Failed to create database record';
        let errorDetails = createError.message || createError.code || 'Unknown error';
        
        if (createError.code === '42501') {
          errorMessage = 'Permission denied: Database record creation failed';
          errorDetails = 'RLS (Row Level Security) policy prevented the insert. ';
          if (!userToken && !serviceRoleKey) {
            errorDetails += 'Anonymous users require SERVICE_ROLE_KEY to be set in Edge Function environment variables. ';
          }
          errorDetails += `Error: ${createError.message}`;
        }
        
        // Return error immediately - database record creation is critical
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: errorDetails,
            code: createError.code,
            hint: createError.hint || (createError.code === '42501' ? 'Set SERVICE_ROLE_KEY environment variable in Edge Function' : null),
            db_error: createError,
            troubleshooting: createError.code === '42501' ? {
              issue: 'RLS policy blocking anonymous insert',
              solution: 'Set SERVICE_ROLE_KEY environment variable in Edge Function settings',
              alternative: 'Or modify RLS policies to allow anonymous inserts'
            } : null
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (createdRecord) {
        analysisId = createdRecord.id;
        console.log('✅ SUCCESS: Database record created IMMEDIATELY!');
        console.log('📊 Created record ID:', analysisId);
        console.log('📊 Record details:', {
          id: createdRecord.id,
          user_id: createdRecord.user_id || 'null (anonymous)',
          text_content_length: createdRecord.text_content?.length || 0,
          image_urls_count: createdRecord.image_urls?.length || 0,
          created_at: createdRecord.created_at
        });
      } else {
        console.error('❌ CRITICAL: Database create returned no error but also no data!');
        return new Response(
          JSON.stringify({ 
            error: 'Database create returned no data',
            details: 'Insert succeeded but no record returned'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (createError) {
      console.error('❌ CRITICAL: Exception while creating database record!');
      console.error('Error type:', typeof createError);
      console.error('Error message:', createError?.message);
      console.error('Error stack:', createError?.stack);
      console.error('Full error:', JSON.stringify(createError, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: 'Database create exception',
          details: createError?.message || String(createError),
          type: typeof createError
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Call Insforge AI with multimodal support
    console.log('Calling Insforge AI...');
    console.log(`Images to analyze: ${images.length}`);
    
    // Build messages with images according to Insforge SDK format
    const userMessage = {
      role: 'user',
      content: userPrompt
    };
    
    // Add images if any were provided (Insforge SDK format)
    if (images.length > 0) {
      console.log('Adding images to AI request:', images);
      // Ensure images are in the correct format for Insforge SDK
      userMessage.images = images.map(url => {
        // Use the URL as-is (should be a full URL from Insforge storage)
        // Insforge storage URLs should be publicly accessible
        const imageUrl = url;
        console.log('Image URL for AI:', imageUrl);
        return { url: imageUrl };
      });
      console.log(`Prepared ${userMessage.images.length} image(s) for AI analysis`);
    }
    
    // Call AI API - this requires authentication
    // Create a separate client for AI operations with aiToken
    const aiClient = createClient({
      baseUrl: Deno.env.get('BACKEND_INTERNAL_URL') || 'http://insforge:7130',
      edgeFunctionToken: aiToken || null  // Use aiToken for AI operations
    });
    
    let completion;
    try {
      console.log('Calling AI API with model: openai/gpt-4o');
      console.log('Messages count:', 2);
      console.log('Has images:', images.length > 0);
      console.log('Using AI token:', !!aiToken);
      console.log('AI token preview:', aiToken ? `${aiToken.substring(0, 20)}...` : 'none');
      
      completion = await aiClient.ai.chat.completions.create({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage
        ],
        temperature: 0.7,
        maxTokens: 1200  // Reduced for faster response
      });
      
      console.log('AI API call successful');
      console.log('Completion structure:', {
        hasChoices: !!completion?.choices,
        choicesLength: completion?.choices?.length || 0,
        hasUsage: !!completion?.usage
      });
    } catch (aiError) {
      console.error('AI API call failed:', aiError);
      
      // Extract error message
      const errorMsg = aiError?.message || String(aiError);
      const errorCode = aiError?.statusCode || aiError?.status || 500;
      
      // Check if it's an authentication error
      if (errorCode === 401 || errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('Invalid token') || errorMsg.includes('AUTH_INVALID_CREDENTIALS')) {
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed. Please ensure you are logged in or ACCESS_API_KEY is configured in the Edge Function environment.',
            details: errorMsg
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Return more detailed error for AI API failures
      return new Response(
        JSON.stringify({ 
          error: 'AI service error',
          details: errorMsg,
          type: 'AIError'
        }),
        { status: errorCode >= 400 && errorCode < 600 ? errorCode : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      console.error('AI did not return a response.');
      console.error('Completion object keys:', Object.keys(completion || {}));
      console.error('Completion.choices:', completion?.choices);
      console.error('Completion.choices[0]:', completion?.choices?.[0]);
      console.error('Full completion:', JSON.stringify(completion, null, 2));
      
      // Check if there's an error in the completion
      if (completion?.error) {
        return new Response(
          JSON.stringify({ 
            error: 'AI API error', 
            details: completion.error,
            type: 'AI_API_ERROR'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'AI did not return a response', 
          details: 'No content in completion.choices[0].message',
          completionStructure: {
            hasChoices: !!completion?.choices,
            choicesLength: completion?.choices?.length || 0,
            firstChoice: completion?.choices?.[0] || null
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('AI response received. Length:', aiResponse.length);
    console.log('AI response (first 500 chars):', aiResponse.substring(0, 500));

    // Parse JSON response from AI - robust parsing with multiple fallback strategies
    let result;
    try {
      let jsonString = aiResponse.trim();
      
      // Strategy 1: Remove markdown code blocks if present
      jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      
      // Strategy 2: Extract JSON object from text (handles cases where AI adds explanation)
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      
      // Strategy 3: Try to fix common JSON issues
      // Remove trailing commas before closing braces/brackets
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      
      // Strategy 4: Parse the cleaned JSON
      result = JSON.parse(jsonString);
      
      // Log successful parse for debugging
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response. Raw response length:', aiResponse.length);
      console.error('Raw response (first 1000 chars):', aiResponse.substring(0, 1000));
      console.error('Parse error:', parseError);
      
      // Return detailed error with full response for debugging (limit to 2000 chars)
      const previewLength = Math.min(2000, aiResponse.length);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response', 
          details: String(parseError),
          rawResponsePreview: aiResponse.substring(0, previewLength) + (aiResponse.length > previewLength ? '...' : ''),
          rawResponseLength: aiResponse.length,
          type: 'PARSE_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Validate AI result structure
    if (!result.overall_score || !result.factors) {
      // If we have an analysis ID, update it with error status
      if (analysisId) {
        try {
          await client.database
            .from('analyses')
            .update({ 
              overall_score: null,
              error: 'Invalid AI response structure'
            })
            .eq('id', analysisId);
        } catch (e) {
          console.error('Failed to update record with error:', e);
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid AI response structure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 4: Update database record with analysis results
    if (analysisId) {
      try {
        console.log('💾 STEP 4: Updating database record with analysis results...');
        console.log('Analysis ID:', analysisId);
        
        const updateData = {
          overall_score: result.overall_score,
          predicted_reach: result.predicted_reach,
          factors: result.factors,
          short_explanation: result.short_explanation || null,
          detailed_reasons: result.detailed_reasons || [],
          improvement_suggestions: result.improvement_suggestions || []
        };
        
        console.log('📝 Updating record with analysis results:', {
          overallScore: updateData.overall_score,
          predictedReach: updateData.predicted_reach,
          hasFactors: !!updateData.factors,
          factorsCount: Object.keys(updateData.factors || {}).length
        });
        
        const { data: updatedRecord, error: updateError } = await client.database
          .from('analyses')
          .update(updateData)
          .eq('id', analysisId)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Failed to update database record!');
          console.error('Error code:', updateError.code);
          console.error('Error message:', updateError.message);
          console.error('Error details:', updateError.details);
          console.error('Full error:', JSON.stringify(updateError, null, 2));
          
          result.db_save_error = {
            message: updateError.message || 'Database update failed',
            code: updateError.code,
            details: updateError.details,
            step: 'update'
          };
          console.warn('⚠️ Analysis completed but database update failed');
        } else if (updatedRecord) {
          console.log('✅ Successfully updated database record!');
          console.log('📊 Updated record details:', {
            id: updatedRecord.id,
            overall_score: updatedRecord.overall_score,
            predicted_reach: updatedRecord.predicted_reach,
            updated_at: updatedRecord.updated_at || 'N/A'
          });
          
          result.analysis_id = analysisId;
          result.db_saved = true;
          console.log('✅ Database update confirmed. Analysis ID:', analysisId);
        } else {
          console.error('❌ Database update returned no error but also no data!');
          result.db_save_error = {
            message: 'Database update returned no data',
            code: 'NO_DATA_RETURNED',
            step: 'update'
          };
        }
      } catch (updateError) {
        console.error('❌ Exception while updating database record:', updateError);
        console.error('Error message:', updateError?.message);
        console.error('Error stack:', updateError?.stack);
        
        result.db_save_error = {
          message: updateError?.message || 'Database update exception',
          type: typeof updateError,
          step: 'update'
        };
        console.warn('⚠️ Analysis completed but database update exception occurred');
      }
    } else {
      console.warn('⚠️ No analysis ID available - skipping database update');
      result.db_save_error = {
        message: 'No analysis ID - record was not created',
        step: 'create'
      };
    }

    // Add user input data and analysis ID to response for frontend display and verification
    result.text_content = tweetText || null;
    result.image_urls = images;
    if (analysisId) {
      result.analysis_id = analysisId;
    }
    
    // Return success response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in score function:', error);
    
    // Extract error message and details
    let errorMessage = 'Internal server error';
    let errorDetails = String(error);
    
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      errorDetails = error.stack || errorDetails;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // Check for specific error types
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid token') || errorMessage.includes('AUTH_INVALID_CREDENTIALS')) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed. Please ensure you are logged in or ACCESS_API_KEY is configured in the Edge Function environment.',
          details: errorMessage
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return detailed error for debugging (in production, you might want to hide details)
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        type: error?.name || 'UnknownError'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
