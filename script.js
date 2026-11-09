
// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// Get HTML elements
const resumeFile = document.getElementById("resumeFile");
const jobDescription = document.getElementById("jobDescription");
const analyzeBtn = document.getElementById("analyzeBtn");
const resumeTextOutput = document.getElementById("resumeTextOutput");
const analysisResults = document.getElementById("analysisResults");
const atsScore = document.getElementById("atsScore");
const matchedSkills = document.getElementById("matchedSkills");
const missingSkills = document.getElementById("missingSkills");
const relevantProjects = document.getElementById("relevantProjects");
const resumeStrengths = document.getElementById("resumeStrengths");
const areasOfImprovement = document.getElementById("areasOfImprovement");
const improvementSuggestions = document.getElementById("improvementSuggestions");
const downloadBtn = document.getElementById("downloadBtn");
const matchedKeywords = document.getElementById("matchedKeywords");
const missingKeywords = document.getElementById("missingKeywords");
let latestAnalysis = null;

// Function to extract text from PDF
async function extractTextFromPDF(file) {

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
    }).promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

        const page = await pdf.getPage(pageNumber);

        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map(item => item.str)
            .join(" ");

        extractedText += pageText + "\n";
    }

    return extractedText;
}
function buildPrompt(resumeText, jobDescription) {

    return `
    You are an expert ATS Resume Analyzer.

    Analyze the candidate's resume against the given job description.

    RESUME:
    ${resumeText}

    JOB DESCRIPTION:
    ${jobDescription}

    Evaluate the following:

    1. Overall ATS match score (0-100).
    2. Matched technical skills.
    3. Missing technical skills.
    4. Relevant projects and experience.
    5. Resume strengths.
    6. Areas of improvement.
    7. Suggestions for improving the resume.

    Do not assume skills or experience that are not
    supported by the resume.

    Return the analysis in valid JSON format.

     IMPORTANT:
    Return the response using exactly these JSON keys:

    {
     "overall_ats_match_score": 0,
     "matched_technical_skills": [],
     "missing_technical_skills": [],
     "relevant_projects_and_experience": [],
     "resume_strengths": [],
     "areas_of_improvement": [],
     "suggestions_for_improvement": []
    }

    Always provide at least 3 useful suggestions for improving the resume.
    Do not omit any key. If no suggestions are applicable, provide general
    relevant recommendations without inventing candidate experience.

    
STRICT OUTPUT REQUIREMENTS:

Return valid JSON with exactly these keys:

{
  "overall_ats_match_score": 0,
  "matched_technical_skills": [],
  "missing_technical_skills": [],
  "relevant_projects_and_experience": [
    {
      "title": "Project name",
      "description": "How this project is relevant to the job"
    }
  ],
  "resume_strengths": [],
  "areas_of_improvement": [],
  "suggestions_for_improvement": []
  "matched_keywords": [],
  "missing_keywords": []
}

Important rules:
1. Never omit any of these keys.
2. relevant_projects_and_experience must always be an array of objects
   containing title and description.
3. Include only projects and experiences actually mentioned in the resume.
4. If no relevant projects exist, return an empty array.
5. Always provide at least 3 actionable resume improvement suggestions.
6. Suggestions must be strings, not objects.
7. Do not invent candidate skills, projects, achievements or experience.
8. Return JSON only. Do not include Markdown code fences.

JOB DESCRIPTION KEYWORD ANALYSIS:

1. Identify important technical and non-technical keywords
   from the job description.
2. Compare them against the actual resume text.
3. Return keywords present in the resume under matched_keywords.
4. Return keywords absent from the resume under missing_keywords.
5. Do not assume a keyword is present just because a related
   skill is mentioned.
6. Return both fields as arrays of strings.

    `;
}

async function callGeminiAPI(prompt) {
    const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt: prompt
        })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Failed to analyze the resume."
        );
    }

    return result.text;
}


function parseGeminiResponse(result) {

    const cleanedResult = result
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleanedResult);
    } catch (error) {
        console.error("JSON Parsing Error:", error);
        console.log("Raw Gemini Response:", cleanedResult);

        throw new Error(
            "Gemini returned invalid JSON. Check the console for details."
        );
    }
}

function displayAnalysis(analysis) {

    // Display ATS score
    const score = Math.max(
    0,
    Math.min(100, Number(analysis.overall_ats_match_score) || 0)
    );

    atsScore.textContent = `${score}%`;

    const scoreCircle = document.getElementById("scoreCircle");

    scoreCircle.style.background = `
        conic-gradient(
            #2563eb ${score * 3.6}deg,
            #e2e8f0 ${score * 3.6}deg
        )
    `;

    // Display matched skills
    matchedSkills.innerHTML = "";

    analysis.matched_technical_skills.forEach(skill => {
        const span = document.createElement("span");
        span.className = "skill-tag matched";
        span.textContent = skill;
        matchedSkills.appendChild(span);
    });

    // Display missing skills
    missingSkills.innerHTML = "";

    analysis.missing_technical_skills.forEach(skill => {
        const span = document.createElement("span");
        span.className = "skill-tag missing";
        span.textContent = skill;
        missingSkills.appendChild(span);
    });

    
// Display matched job description keywords
matchedKeywords.innerHTML = "";

const foundKeywords = analysis.matched_keywords || [];

if (foundKeywords.length > 0) {

    foundKeywords.forEach(keyword => {

        const span = document.createElement("span");
        span.className = "skill-tag matched";
        span.textContent = keyword;

        matchedKeywords.appendChild(span);
    });

} else {
    matchedKeywords.textContent = "No matching keywords found.";
}


// Display missing job description keywords
missingKeywords.innerHTML = "";

const absentKeywords = analysis.missing_keywords || [];

if (absentKeywords.length > 0) {

    absentKeywords.forEach(keyword => {

        const span = document.createElement("span");
        span.className = "skill-tag missing";
        span.textContent = keyword;

        missingKeywords.appendChild(span);
    });

} else {
    missingKeywords.textContent = "No missing keywords identified.";
}


    
// Display relevant projects and experience
relevantProjects.innerHTML = "";

const projects = analysis.relevant_projects_and_experience || [];

if (Array.isArray(projects) && projects.length > 0) {

    projects.forEach(project => {

        const div = document.createElement("div");
        div.className = "project-item";

        const heading = document.createElement("h4");
        const paragraph = document.createElement("p");

        // Handle both object and string responses
        if (typeof project === "string") {
            heading.textContent = "Relevant Experience";
            paragraph.textContent = project;
        } else {
            heading.textContent =
                project.title || project.name || "Relevant Project";

            paragraph.textContent =
                project.description || project.relevance || "No description provided.";
        }

        div.appendChild(heading);
        div.appendChild(paragraph);

        relevantProjects.appendChild(div);
    });

} else {
    relevantProjects.textContent =
        "No relevant projects or experiences identified.";
}


    // Display resume strengths
    displayList(resumeStrengths, analysis.resume_strengths);

    // Display areas of improvement
    displayList(areasOfImprovement, analysis.areas_of_improvement);

    
// Display improvement suggestions
const suggestions =
    analysis.suggestions_for_improvement ??
    analysis.suggestions_for_improving_the_resume ??
    analysis.suggestions_for_improvements ??
    [];

displayList(improvementSuggestions, suggestions);
// Show the complete results section
    analysisResults.hidden = false;

}



function downloadAnalysisPDF(analysis) {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let y = 20;

    // Colors
    const blue = [37, 99, 235];
    const dark = [30, 41, 59];
    const gray = [100, 116, 139];

    // Header
    doc.setFillColor(...blue);
    doc.rect(0, 0, pageWidth, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(23);
    doc.setFont("helvetica", "bold");
    doc.text("ResumeIQ", 20, 19);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Resume Analysis Report", 20, 28);

    y = 52;

    // ATS Score Section
    doc.setTextColor(...dark);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Overall ATS Match Score", 20, y);

    y += 15;

    const score = Math.max(
        0,
        Math.min(100, Number(analysis.overall_ats_match_score) || 0)
    );

    // Score background
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(20, y, 170, 12, 5, 5, "F");

    // Score progress
    doc.setFillColor(...blue);
    doc.roundedRect(20, y, 170 * score / 100, 12, 5, 5, "F");

    y += 23;

    doc.setTextColor(...blue);
    doc.setFontSize(24);
    doc.text(`${score}%`, 20, y);

    y += 18;

    // Reusable section function
    function addSection(title, items) {

        if (!Array.isArray(items) || items.length === 0) return;

        if (y > pageHeight - 35) {
            doc.addPage();
            y = 20;
        }

        // Section heading
        doc.setTextColor(...blue);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title, 20, y);

        y += 5;

        // Divider
        doc.setDrawColor(...blue);
        doc.line(20, y, pageWidth - 20, y);

        y += 9;

        doc.setTextColor(...dark);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        items.forEach(item => {

            let content;

            if (typeof item === "string") {
                content = item;
            } else {
                content = `${item.title || "Project"}: ${item.description || ""}`;
            }

            const lines = doc.splitTextToSize(content, 165);

            const requiredHeight = lines.length * 5 + 5;

            if (y + requiredHeight > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }

            doc.text(lines, 22, y);
            y += requiredHeight;
        });

        y += 10;
    }

    // Report sections
    addSection("Matched Technical Skills",
        analysis.matched_technical_skills);

    addSection("Missing Technical Skills",
        analysis.missing_technical_skills);

    addSection("Relevant Projects and Experience",
        analysis.relevant_projects_and_experience);

    addSection("Resume Strengths",
        analysis.resume_strengths);

    addSection("Areas of Improvement",
        analysis.areas_of_improvement);

    addSection("Improvement Suggestions",
        analysis.suggestions_for_improvement ||
        analysis.suggestions_for_improving_the_resume ||
        analysis.suggestions_for_improvements
    );
    addSection(
       "Matched Job Description Keywords",
        analysis.matched_keywords
    );

    addSection(
        "Missing Job Description Keywords",
        analysis.missing_keywords
    );
    

    // Footer on every page
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {

        doc.setPage(i);

        doc.setFontSize(9);
        doc.setTextColor(...gray);

        doc.text(
            "Generated by ResumeIQ | AI Resume Analyzer",
            20,
            pageHeight - 10
        );

        doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth - 20,
            pageHeight - 10,
            { align: "right" }
        );
    }

    // Download
    doc.save("ResumeIQ_Professional_Report.pdf");
}



// Reusable function to display list items
function displayList(element, items) {

    element.innerHTML = "";

    (items || []).forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        element.appendChild(li);
    });
}

function highlightResumeKeywords(text, keywords) {
    const terms = [...new Set(
        (keywords || [])
            .filter(k => typeof k === "string" && k.trim() !== "")
    )].sort((a, b) => b.length - a.length);

    resumeTextOutput.replaceChildren();

    if (terms.length === 0) {
        resumeTextOutput.textContent = text;
        return;
    }

    const escapedTerms = terms.map(keyword =>
        keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );

    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const parts = text.split(regex);

    parts.forEach(part => {
        if (terms.some(k => k.toLowerCase() === part.toLowerCase())) {
            const mark = document.createElement("mark");
            mark.textContent = part;
            resumeTextOutput.appendChild(mark);
        } else {
            resumeTextOutput.appendChild(document.createTextNode(part));
        }
    });
}
// Analyze button functionality
analyzeBtn.addEventListener("click", async function () {

    if (resumeFile.files.length === 0) {
        alert("Please upload your resume!");
        return;
    }

    if (jobDescription.value.trim() === "") {
        alert("Please enter the job description!");
        return;
    }

    const file = resumeFile.files[0];

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        alert("Please select a PDF file!");
        return;
    }

    try {

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "Extracting Resume...";

        // Step 1: Extract resume text
        const resumeText = await extractTextFromPDF(file);

        if (resumeText.trim() === "") {
            throw new Error("No readable text found in this PDF.");
        }

        resumeTextOutput.textContent = resumeText;

        // Step 2: Create Gemini prompt
        const prompt = buildPrompt(
            resumeText,
            jobDescription.value
        );

        // Step 3: Call Gemini API
        analyzeBtn.textContent = "Analyzing with Gemini...";

        const result = await callGeminiAPI(prompt);
        const analysis = parseGeminiResponse(result);
        latestAnalysis = analysis;

        console.log("Relevant Projects:", analysis.relevant_projects_and_experience);

        console.log("Improvement Suggestions:",
            analysis.suggestions_for_improvement
        );

        displayAnalysis(analysis);

        highlightResumeKeywords(resumeText, analysis.matched_keywords);

        console.log("Parsed Analysis:", analysis);


        alert("AI Resume Analysis completed successfully!");

    } catch (error) {

        console.error("Analysis Error:", error);

        alert(error.message || "Something went wrong!");

    } finally {

        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze Resume";

    }

});



async function testGemini() {

    try {

        const result = await callGeminiAPI(
            "Explain what an ATS resume analyzer does in two sentences."
        );

        console.log("Gemini Response:", result);

    } catch (error) {

        console.error("Gemini Test Failed:", error);

    }

}

testGemini();

downloadBtn.addEventListener("click", function () {

    console.log("Download button clicked!");

    console.log("Latest Analysis:", latestAnalysis);

    if (!latestAnalysis) {
        alert("Please analyze a resume first!");
        return;
    }

    try {
        downloadAnalysisPDF(latestAnalysis);
        console.log("PDF generation function executed!");
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("PDF Error: " + error.message);
    }

});