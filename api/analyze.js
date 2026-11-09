
module.exports = async (req, res) => {
    // Accept only POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    // Read the secret key from Vercel environment variables
    const API_KEY = process.env.GEMINI_API_KEY;
    const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    if (!API_KEY) {
        return res.status(500).json({
            error: "Gemini API key is not configured on the server."
        });
    }

    const prompt = req.body?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({
            error: "A valid analysis prompt is required."
        });
    }

    if (prompt.length > 100000) {
        return res.status(413).json({
            error: "The analysis prompt is too large."
        });
    }

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": API_KEY
                },
                body: JSON.stringify({
                    model: MODEL,
                    input: prompt
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", result);

            return res.status(response.status).json({
                error: result.error?.message || "Gemini API request failed."
            });
        }

        // Extract generated text from the Interactions API response
        let outputText = result.output_text;

        if (!outputText && Array.isArray(result.steps)) {
            const modelOutputs = result.steps.filter(
                step => step.type === "model_output"
            );

            const lastOutput = modelOutputs[modelOutputs.length - 1];

            outputText = (lastOutput?.content || [])
                .filter(item => item.type === "text")
                .map(item => item.text)
                .join("\n");
        }

        if (!outputText) {
            throw new Error("Gemini returned an empty response.");
        }

        return res.status(200).json({
            text: outputText
        });

    } catch (error) {
        console.error("Server Error:", error);

        return res.status(500).json({
            error: error.message || "Internal server error."
        });
    }
};
