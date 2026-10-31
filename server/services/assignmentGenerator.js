// AI Assignment Generator & Independent Verification Service
import { wrapCodeWithDriver } from './executionDriver.js';
import { executeBatchTestcasesInternal, compareOutputs } from '../index.js';

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-pro-latest'
];

async function callGemini(apiKey, prompt) {
  if (!apiKey) throw new Error('Gemini API key is required');

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = new Error(`Model ${model} returned ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      return JSON.parse(rawText);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

/**
 * AI Assignment Analyzer & Synthesizer
 */
export async function analyzeAndGenerateAssignment({
  title = '',
  problemStatement = '',
  languages = ['python', 'javascript', 'cpp', 'c', 'java'],
  difficulty = 'Medium',
  apiKey = ''
}) {
  if (!problemStatement.trim()) {
    throw new Error('Problem statement is required for AI generation');
  }

  const prompt = `You are a Senior Computer Science Curriculum Designer and LeetCode Engineer.
Analyze the following assignment problem and generate a complete, production-grade LeetCode-style coding environment configuration.

ASSIGNMENT TITLE: "${title}"
PROBLEM STATEMENT:
${problemStatement}

TARGET LANGUAGES: ${languages.join(', ')}
DIFFICULTY: ${difficulty}

You must respond ONLY with a single JSON object in the exact following schema:
{
  "problemSummary": "Concise 1-2 sentence overview of what the student must implement",
  "inputRequirements": "Clear description of inputs and their types",
  "expectedOutputRequirements": "Clear description of return value / output",
  "constraints": "e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9",
  "edgeCases": ["e.g. Empty list", "e.g. All elements identical", "e.g. Negative values"],
  "executionMode": "function",
  "functionConfig": {
    "functionName": "meaningfulCamelCaseFunctionName",
    "className": "Solution",
    "returnType": "int / int[] / string / boolean / float",
    "parameters": [
      {
        "name": "paramName",
        "type": "int / int[] / string / boolean / float",
        "description": "description of parameter"
      }
    ]
  },
  "starterCode": {
    "python": "def functionName(params):\\n    # TODO: Write your business logic here\\n    pass\\n",
    "javascript": "function functionName(params) {\\n    // TODO: Write your business logic here\\n}\\n",
    "cpp": "class Solution {\\npublic:\\n    returnType functionName(params) {\\n        // TODO: Write your business logic here\\n    }\\n};\\n",
    "c": "returnType functionName(params) {\\n    // TODO: Write your business logic here\\n}\\n",
    "java": "public class Solution {\\n    public returnType functionName(params) {\\n        // TODO: Write your business logic here\\n    }\\n}\\n"
  },
  "referenceSolutionPython": "A complete, correct, bug-free Python 3 reference solution for independent verification. Do NOT include input() or print(); only return the correct result from the function.",
  "candidateTestcases": [
    {
      "category": "basic",
      "input": "Clean stdin or JSON representation of inputs. If multiple params, space-separated on one line or newline-separated",
      "expectedOutput": "Exact expected return value string / JSON",
      "explanation": "Why this output is expected"
    },
    {
      "category": "normal",
      "input": "...",
      "expectedOutput": "...",
      "explanation": "..."
    },
    {
      "category": "boundary",
      "input": "...",
      "expectedOutput": "...",
      "explanation": "..."
    },
    {
      "category": "edge",
      "input": "...",
      "expectedOutput": "...",
      "explanation": "..."
    },
    {
      "category": "hidden",
      "input": "...",
      "expectedOutput": "...",
      "explanation": "Secret testcase"
    },
    {
      "category": "hidden",
      "input": "...",
      "expectedOutput": "...",
      "explanation": "Secret testcase"
    }
  ],
  "quizQuestions": [
    {
      "question": "Question testing the core algorithm or concept of this assignment",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Educational walkthrough of correct answer",
      "difficulty": "Medium"
    }
  ]
}

STRICT QUALITY RULES:
1. "functionConfig.functionName" must be concise, standard camelCase (e.g. "twoSum", "findMax", "reverseList").
2. "referenceSolutionPython" MUST be 100% correct and executable.
3. Every test case "input" must match the parameters defined in "functionConfig.parameters".
4. Every test case "expectedOutput" must match the return type.
5. Provide at least 4 public test cases (basic, normal, boundary, edge) and 2 hidden test cases.
6. Provide at least 5 relevant multiple-choice quiz questions with 4 distinct options each.`;

  const aiData = await callGemini(apiKey, prompt);

  // Run Independent Test Case Verification
  const verificationReport = await verifyTestcasesIndependently({
    functionConfig: aiData.functionConfig,
    referenceSolutionPython: aiData.referenceSolutionPython,
    candidateTestcases: aiData.candidateTestcases
  });

  return {
    ...aiData,
    verification: verificationReport,
    verifiedTestcases: verificationReport.verifiedTestcases
  };
}

/**
 * Independently executes reference solution against candidate test cases
 */
export async function verifyTestcasesIndependently({
  functionConfig,
  referenceSolutionPython,
  candidateTestcases = []
}) {
  if (!referenceSolutionPython || !candidateTestcases.length) {
    return {
      success: false,
      error: 'Missing reference solution or testcases for verification',
      verifiedTestcases: candidateTestcases.map(tc => ({ ...tc, verified: false }))
    };
  }

  try {
    // 1. Wrap reference solution with Python execution driver
    const wrappedPythonCode = wrapCodeWithDriver({
      language: 'python',
      code: referenceSolutionPython,
      functionConfig
    });

    // 2. Execute batch using existing internal compiler
    const batchResult = await executeBatchTestcasesInternal({
      language: 'python',
      code: wrappedPythonCode,
      testcases: candidateTestcases
    });

    // 3. Compare outputs and flag verified testcases
    const verifiedTestcases = candidateTestcases.map((tc, idx) => {
      const execCase = batchResult.results?.[idx];
      const actualOut = (execCase?.actualOutput || '').trim();
      const expectedOut = (tc.expectedOutput || '').trim();

      // If reference solution ran cleanly and passed or gave genuine output matching expected
      const comp = compareOutputs(actualOut, expectedOut);
      const matches = execCase?.passed || comp.passed || actualOut === expectedOut;
      const isVerified = Boolean(execCase && execCase.status !== 'Compile Error' && execCase.status !== 'Runtime Error' && matches);

      return {
        ...tc,
        // If actual output from reference solution matches structurally, ensure clean normalized output
        expectedOutput: isVerified && actualOut ? actualOut : tc.expectedOutput,
        verified: isVerified,
        actualOutputFromRef: actualOut,
        refStatus: execCase?.status || (isVerified ? 'Accepted' : 'Wrong Answer')
      };
    });

    const allPassed = verifiedTestcases.every(tc => tc.verified);

    return {
      success: true,
      allPassed,
      passedCount: verifiedTestcases.filter(tc => tc.verified).length,
      totalCount: verifiedTestcases.length,
      referenceStatus: batchResult.hasCompileError ? 'Compile Error' : 'Executed',
      verifiedTestcases
    };
  } catch (err) {
    return {
      success: false,
      error: 'Verification execution failed: ' + err.message,
      verifiedTestcases: candidateTestcases.map(tc => ({ ...tc, verified: false, error: err.message }))
    };
  }
}
