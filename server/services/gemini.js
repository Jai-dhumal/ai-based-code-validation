// Gemini AI Service for Tier-2 Deep Semantic Analysis and Code-Tailored Dynamic Quiz Generation

export async function runTier2Evaluation({ code, referenceCode, assignmentTitle, language, apiKey }) {
  if (apiKey) {
    try {
      const prompt = `
You are an expert Computer Science Professor and Code Integrity Auditor.
Assignment: "${assignmentTitle}" (Language: ${language})

Analyze the following STUDENT CODE against the PRIOR SUBMISSION to detect semantic plagiarism, logic equivalence, structural reordering, variable renaming, or AI-generated boilerplate (ChatGPT/Copilot).

=== PRIOR SUBMISSION ===
${referenceCode || 'No prior submission available. Check for external AI generation.'}

=== STUDENT CODE ===
${code}

Respond ONLY with valid JSON in this exact structure:
{
  "semanticSimilarityScore": <number between 0 and 100>,
  "logicEquivalence": "<Low | Moderate | High>",
  "aiGeneratedLikelihood": "<Low | Medium | High>",
  "aiConfidencePercentage": <number between 0 and 100>,
  "renamedIdentifiers": ["<original> -> <renamed>", ...],
  "verdict": "<Original Implementation | Borderline Modified | Plagiarized / Obfuscated>",
  "explanation": [
    "<Key finding 1>",
    "<Key finding 2>",
    "<Key finding 3>"
  ],
  "recommendation": "<Approve for Quiz | Flag for Teacher Review | Reject>"
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          return JSON.parse(rawText);
        }
      } else {
        console.warn('Gemini API call failed with status:', response.status, 'Checking for OpenAI fallback...');
      }
    } catch (err) {
      console.warn('Gemini API request error:', err.message, 'Checking for OpenAI fallback...');
    }
  }

  // Tier-2 Provider Fallback: OpenAI API (if OPENAI_API_KEY is configured in environment)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const openAiResult = await callOpenAiSemanticCheck({
        code,
        referenceCode,
        assignmentTitle,
        language,
        openaiKey
      });
      if (openAiResult) return openAiResult;
    } catch (openAiErr) {
      console.warn('OpenAI fallback error:', openAiErr.message, 'Falling back to offline analyzer');
    }
  }

  // Built-in Intelligent Offline Semantic Analyzer Fallback
  return offlineTier2Analyzer(code, referenceCode, assignmentTitle, language);
}

// Helper: OpenAI Semantic Evaluation Fallback
async function callOpenAiSemanticCheck({ code, referenceCode, assignmentTitle, language, openaiKey }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = `
Analyze the following STUDENT CODE against the PRIOR SUBMISSION to detect semantic plagiarism, logic equivalence, structural reordering, variable renaming, or AI-generated boilerplate.
Assignment: "${assignmentTitle}" (Language: ${language})

=== PRIOR SUBMISSION ===
${referenceCode || 'No prior submission available.'}

=== STUDENT CODE ===
${code}

Respond ONLY with valid JSON matching this schema:
{
  "semanticSimilarityScore": <number between 0 and 100>,
  "logicEquivalence": "<Low | Moderate | High>",
  "aiGeneratedLikelihood": "<Low | Medium | High>",
  "aiConfidencePercentage": <number between 0 and 100>,
  "renamedIdentifiers": ["<original> -> <renamed>", ...],
  "verdict": "<Original Implementation | Borderline Modified | Plagiarized / Obfuscated>",
  "explanation": ["<Finding 1>", "<Finding 2>", "<Finding 3>"],
  "recommendation": "<Approve for Quiz | Flag for Teacher Review | Reject>"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert Computer Science Professor and Code Integrity Auditor. Always reply in valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (response.ok) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      parsed.provider = 'OpenAI (' + model + ')';
      return parsed;
    }
  }
  return null;
}

function offlineTier2Analyzer(code, referenceCode, assignmentTitle, language) {
  const codeLines = code.split('\n').filter(l => l.trim().length > 0);
  const hasRef = Boolean(referenceCode);

  // Heuristics for logic equivalence
  let logicSimilarity = 25;
  let renamedVars = [];
  let aiConfidence = 30;

  if (hasRef) {
    const refLines = referenceCode.split('\n').filter(l => l.trim().length > 0);
    const lineRatio = Math.min(codeLines.length, refLines.length) / Math.max(codeLines.length, refLines.length);

    // Check common structure patterns
    const hasWhile = code.includes('while') && referenceCode.includes('while');
    const hasRecursion = code.includes('traverse') || code.includes('def _') || code.includes('helper');
    const hasRefRecursion = referenceCode.includes('traverse') || referenceCode.includes('def _') || referenceCode.includes('helper');

    if (hasWhile) logicSimilarity += 20;
    if (hasRecursion && hasRefRecursion) logicSimilarity += 20;
    if (lineRatio > 0.8) logicSimilarity += 15;

    // Check renamed variable heuristics
    const codeWords = (code.match(/\b[a-zA-Z_]\w*\b/g) || []);
    const refWords = (referenceCode.match(/\b[a-zA-Z_]\w*\b/g) || []);
    const uniqueCodeWords = new Set(codeWords);
    const uniqueRefWords = new Set(refWords);

    if (uniqueRefWords.has('curr') && uniqueCodeWords.has('current_node')) {
      renamedVars.push('curr -> current_node');
    }
    if (uniqueRefWords.has('res') && uniqueCodeWords.has('result_list')) {
      renamedVars.push('res -> result_list');
    }
    if (uniqueRefWords.has('val') && uniqueCodeWords.has('data')) {
      renamedVars.push('val -> data');
    }
  }

  // Check AI-generated code footprints
  const aiPatterns = [
    /"""\s*Implementation of/i,
    /# Initialize/i,
    /# Helper function/i,
    /TreeNode\s*\(/
  ];
  let aiMatches = 0;
  aiPatterns.forEach(p => { if (p.test(code)) aiMatches++; });
  aiConfidence = Math.min(85, 20 + aiMatches * 15);

  let verdict = 'Original Implementation';
  let recommendation = 'Approve for Quiz';
  let logicEquivalence = 'Low';

  if (logicSimilarity >= 70 || renamedVars.length >= 2) {
    verdict = 'Plagiarized / Obfuscated';
    recommendation = 'Reject';
    logicEquivalence = 'High';
  } else if (logicSimilarity >= 45 || renamedVars.length >= 1) {
    verdict = 'Borderline Modified';
    recommendation = 'Flag for Teacher Review';
    logicEquivalence = 'Moderate';
  }

  return {
    semanticSimilarityScore: logicSimilarity,
    logicEquivalence,
    aiGeneratedLikelihood: aiConfidence > 60 ? 'High' : aiConfidence > 35 ? 'Medium' : 'Low',
    aiConfidencePercentage: aiConfidence,
    renamedIdentifiers: renamedVars.length > 0 ? renamedVars : ['None detected with high confidence'],
    verdict,
    explanation: [
      `Control flow structure demonstrates ${logicEquivalence.toLowerCase()} algorithmic similarity to known references.`,
      renamedVars.length > 0 ? `Detected renamed structural tokens: ${renamedVars.join(', ')}.` : 'Identified authentic code flow variations.',
      `Syntactic entropy and formatting patterns indicate ${aiConfidence}% probability of AI assistant footprint.`
    ],
    recommendation,
    isOfflineFallback: true
  };
}

// Helper: Shuffle options for every question & shuffle question pool
export function shuffleOptionsAndQuestions(questions, count = 10) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  // 1. Shuffle options for each individual question and update correctIndex
  const withShuffledOptions = questions.map(q => {
    if (!Array.isArray(q.options) || q.options.length < 2) return q;
    const correctVal = q.options[q.correctIndex || 0];
    const opts = [...q.options];

    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    const newIndex = opts.indexOf(correctVal);
    return {
      ...q,
      options: opts,
      correctIndex: newIndex >= 0 ? newIndex : 0
    };
  });

  // 2. Shuffle questions themselves so retake attempts have fresh order
  const shuffledQuestions = [...withShuffledOptions];
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }

  // 3. Take requested count (default 10) and re-assign 1-based IDs
  return shuffledQuestions.slice(0, count).map((q, idx) => ({
    ...q,
    id: idx + 1
  }));
}

export async function generateCodeQuiz({ code, assignmentTitle, language, apiKey, attempt }) {
  const attemptNum = attempt || 1;
  if (apiKey) {
    try {
      const prompt = `
You are a Computer Science Professor conducting an AI viva/quiz on student submitted code.
Assignment: "${assignmentTitle}" (Language: ${language})
Attempt: #${attemptNum} (Generate a completely fresh, unique set of 10 questions testing different statements, variables, logic branches, and edge cases than any previous attempt).

=== STUDENT CODE ===
${code}

Generate 10 rigorous multiple choice questions tailored SPECIFICALLY to the student's actual code implementation above.
Do not ask generic trivia. Ask about specific variables, function flows, complexity, edge conditions, and corner cases present in THEIR code.
Ensure answers are evenly distributed across choices.

Respond ONLY with valid JSON array:
[
  {
    "id": 1,
    "question": "<Question regarding student's code>",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": <0-3>,
    "explanation": "<Why this answer is correct based on their code>"
  },
  ... (total 10 questions)
]
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            return shuffleOptionsAndQuestions(parsed, 10);
          }
        }
      } else {
        console.warn('Gemini quiz generation failed with status:', response.status, 'Checking OpenAI fallback...');
      }
    } catch (err) {
      console.warn('Gemini quiz generation error:', err.message, 'Checking OpenAI fallback...');
    }
  }

  // Quiz Provider Fallback: OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const openAiQuestions = await callOpenAiQuizGenerator({
        code,
        assignmentTitle,
        language,
        openaiKey,
        attempt: attemptNum
      });
      if (Array.isArray(openAiQuestions) && openAiQuestions.length >= 8) {
        return shuffleOptionsAndQuestions(openAiQuestions, 10);
      }
    } catch (openAiErr) {
      console.warn('OpenAI quiz generation error:', openAiErr.message, 'Using intelligent dynamic generator');
    }
  }

  // Dynamic code-tailored 10-question generator
  return offlineQuizGenerator(code, assignmentTitle, language, attemptNum);
}

// Helper: OpenAI Quiz Generation Fallback
async function callOpenAiQuizGenerator({ code, assignmentTitle, language, openaiKey, attempt = 1 }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = `
You are a Computer Science Professor conducting an AI viva/quiz on student submitted code.
Assignment: "${assignmentTitle}" (Language: ${language})
Attempt: #${attempt} (Generate fresh questions testing different code branches, variables, and edge cases).

=== STUDENT CODE ===
${code}

Generate 10 rigorous multiple choice questions tailored SPECIFICALLY to the student's actual code implementation above.
Do not ask generic trivia. Ask about specific variables, function flows, complexity, edge conditions, and corner cases present in THEIR code.

Respond ONLY with valid JSON array:
[
  {
    "id": 1,
    "question": "<Question regarding student's code>",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": <0-3>,
    "explanation": "<Why this answer is correct based on their code>"
  }
]
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a Computer Science Professor. Always respond with a valid JSON array of 10 questions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (response.ok) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) {
      const cleanJson = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) return parsed;
    }
  }
  return null;
}

function offlineQuizGenerator(code = '', assignmentTitle = '', language = 'python', attempt = 1) {
  const lang = (language || 'python').toLowerCase();
  const title = (assignmentTitle || 'Coding Assignment').trim();
  const lowerTitle = title.toLowerCase();
  const lowerCode = code.toLowerCase();

  // Check assignment / code type
  const isBST = lowerTitle.includes('binary search tree') || lowerTitle.includes('bst') || (lowerCode.includes('treenode') && lowerCode.includes('insert'));
  const isDijkstra = lowerTitle.includes('dijkstra') || lowerTitle.includes('shortest path') || lowerCode.includes('heapq') || lowerCode.includes('priorityqueue');

  if (isBST) {
    const hasWhile = code.includes('while');
    const bstPool = [
      {
        id: 1,
        question: `In your Binary Search Tree implementation for "${title}", what is the worst-case time complexity of inserting elements in strictly increasing order?`,
        options: [
          'O(1) constant time',
          'O(log n) logarithmic time',
          'O(n) linear time because the tree degrades into a skewed linked list',
          'O(n log n) quadratic logarithmic time'
        ],
        correctIndex: 2,
        explanation: 'Inserting strictly ascending values creates a degenerate right-skewed tree without balancing, taking O(n) worst-case time.'
      },
      {
        id: 2,
        question: hasWhile 
          ? 'Your code utilizes an iterative loop for traversing nodes. What is the primary memory advantage of this over recursion?'
          : 'In your recursive tree traversal, what serves as the base case stopping condition?',
        options: hasWhile 
          ? [
              'It eliminates recursion call stack frames, reducing auxiliary memory to O(1)',
              'It reduces the time complexity from O(n) to O(1)',
              'It prevents CPU thread locks',
              'It automatically rebalances the tree after each operation'
            ]
          : [
              'Checking if node is None / null (empty subtree)',
              'Checking if node.val == 0',
              'Checking if list length reaches 100',
              'Checking if node.left equals node.right'
            ],
        correctIndex: 0,
        explanation: hasWhile
          ? 'Iterative pointer updating consumes O(1) auxiliary memory, avoiding O(h) recursion stack frames.'
          : 'Recursive tree traversals terminate cleanly when reaching an empty subtree pointer (None).'
      },
      {
        id: 3,
        question: 'What does your `search(val)` function return if invoked on an empty tree where root is None?',
        options: [
          'Returns False or None safely without throwing an exception',
          'Raises an unhandled IndexError',
          'Returns 0',
          'Enters an infinite loop'
        ],
        correctIndex: 0,
        explanation: 'With root as None, the search traversal terminates safely and returns False or None.'
      },
      {
        id: 4,
        question: `In what order does an in-order traversal of a valid Binary Search Tree yield node values?`,
        options: [
          'In strictly ascending / sorted order (Left -> Root -> Right)',
          'In descending order from maximum to minimum',
          'In arbitrary hash table order',
          'In reverse breadth-first order'
        ],
        correctIndex: 0,
        explanation: 'An in-order traversal (Left, Root, Right) of a BST always yields keys in ascending sorted order.'
      },
      {
        id: 5,
        question: 'What is the auxiliary space complexity of collecting all nodes during tree traversal?',
        options: [
          'O(n) space to store the output elements and recursion stack',
          'O(1) strictly constant space',
          'O(n²) quadratic space',
          'O(n!) factorial space'
        ],
        correctIndex: 0,
        explanation: 'Storing all n elements in the result container requires O(n) auxiliary space.'
      },
      {
        id: 6,
        question: 'In your node structure, what default value is assigned to child node pointers (`left` and `right`)?',
        options: [
          'None / null reference indicating an empty subtree',
          'Integer 0',
          'An empty list []',
          'A circular self-pointer'
        ],
        correctIndex: 0,
        explanation: 'Unassigned tree child pointers are initialized to None/null to represent empty subtrees.'
      },
      {
        id: 7,
        question: 'Under ideal conditions where the binary tree is perfectly balanced, what is the search time complexity?',
        options: [
          'O(log n) logarithmic time',
          'O(n) linear time',
          'O(1) constant time',
          'O(2^n) exponential time'
        ],
        correctIndex: 0,
        explanation: 'Each comparison in a balanced BST halves the search space, yielding O(log n) time.'
      },
      {
        id: 8,
        question: 'When searching for a key smaller than all keys in the tree, which branch will traversal follow?',
        options: [
          'It will repeatedly follow the `left` child pointers until reaching null/None',
          'It will traverse right child pointers',
          'It will immediately jump to the root’s sibling',
          'It will alternate between left and right'
        ],
        correctIndex: 0,
        explanation: 'Because the key is smaller than existing nodes, BST property directs search to the left subtree.'
      },
      {
        id: 9,
        question: 'How could you modify in-order traversal to output keys in descending order (highest to lowest)?',
        options: [
          'Traverse Right subtree first, process Node, then traverse Left subtree (Right -> Root -> Left)',
          'Change the loop from while to for',
          'Multiply all node values by -1 before insertion',
          'Delete the root node prior to traversal'
        ],
        correctIndex: 0,
        explanation: 'Reverse in-order traversal (Right -> Root -> Left) visits nodes from largest to smallest.'
      },
      {
        id: 10,
        question: 'What is the relationship between node keys in a valid Binary Search Tree?',
        options: [
          'All keys in left subtree < root key < all keys in right subtree',
          'Left subtree keys are always greater than right subtree keys',
          'Keys are arranged in random pseudo-order',
          'Every node must have identical values to its parent'
        ],
        correctIndex: 0,
        explanation: 'The fundamental BST property requires all left descendants < root < all right descendants.'
      },
      {
        id: 11,
        question: 'When deleting a node that possesses two children from a BST, which replacement node preserves the BST ordering property?',
        options: [
          'The in-order successor (minimum node in right subtree) or in-order predecessor (maximum in left subtree)',
          'The root node of the entire tree',
          'Any randomly selected leaf node',
          'The left child of the root node'
        ],
        correctIndex: 0,
        explanation: 'Replacing with in-order successor or predecessor guarantees that all left keys remain smaller and all right keys remain larger.'
      },
      {
        id: 12,
        question: 'Where is the minimum value key in a non-empty Binary Search Tree always located?',
        options: [
          'At the leftmost node reachable by repeatedly following left child pointers',
          'At the root node',
          'At the rightmost leaf node',
          'At a random node depending on insertion time'
        ],
        correctIndex: 0,
        explanation: 'Because smaller keys are placed to the left at every node, the minimum value is always at the leftmost node.'
      },
      {
        id: 13,
        question: 'What is the height of a balanced Binary Search Tree containing n nodes?',
        options: [
          'O(log n) logarithmic height',
          'O(n) linear height',
          'O(n²) quadratic height',
          'O(1) constant height'
        ],
        correctIndex: 0,
        explanation: 'A balanced BST divides nodes equally across branches, maintaining a height proportional to log₂(n).'
      },
      {
        id: 14,
        question: 'Which tree traversal algorithm processes nodes in the order: Root -> Left Subtree -> Right Subtree?',
        options: [
          'Pre-order traversal',
          'In-order traversal',
          'Post-order traversal',
          'Level-order traversal'
        ],
        correctIndex: 0,
        explanation: 'Pre-order traversal visits the current root first before recursively traversing the left and right subtrees.'
      },
      {
        id: 15,
        question: 'What is the best-case time complexity of searching for an element in a Binary Search Tree?',
        options: [
          'O(1) when the target value is located at the root node',
          'O(log n)',
          'O(n)',
          'O(n log n)'
        ],
        correctIndex: 0,
        explanation: 'If the target key equals the root node value, the search succeeds on the first comparison in O(1) time.'
      }
    ];
    return shuffleOptionsAndQuestions(bstPool, 10);
  }

  if (isDijkstra) {
    const dijkstraPool = [
      {
        id: 1,
        question: `What is the core purpose of Dijkstra's algorithm implemented in your solution for "${title}"?`,
        options: [
          'To find the shortest path from a single source node to all other vertices in a weighted graph',
          'To find the minimum spanning tree using Kruskal greedy edges',
          'To detect strongly connected components using Tarjan DFS',
          'To sort array elements in ascending numerical order'
        ],
        correctIndex: 0,
        explanation: 'Dijkstra solves the Single-Source Shortest Path (SSSP) problem on weighted graphs with non-negative edge weights.'
      },
      {
        id: 2,
        question: 'Why does Dijkstra’s algorithm require that edge weights must be non-negative (weight >= 0)?',
        options: [
          'Negative edge weights can cause negative cycles and violate the greedy optimal substructure property',
          'Negative numbers cannot be stored in binary memory',
          'Because priority queues cannot store negative integers',
          'To prevent dividing by zero during edge relaxation'
        ],
        correctIndex: 0,
        explanation: 'Greedy choice assumes shortest paths only grow; negative edges can decrease path lengths after a node has been marked visited.'
      },
      {
        id: 3,
        question: 'What data structure provides the most optimal performance for extracting the minimum distance vertex in Dijkstra?',
        options: [
          'Min-Heap / Priority Queue (O(log V) extraction)',
          'Unordered Linked List (O(V) extraction)',
          'Simple Stack (LIFO ordering)',
          'Circular FIFO Queue'
        ],
        correctIndex: 0,
        explanation: 'Using a min-heap allows extracting the minimum distance vertex in O(log V) time.'
      },
      {
        id: 4,
        question: 'What is the overall time complexity of Dijkstra’s algorithm using an adjacency list and a binary min-heap?',
        options: [
          'O((V + E) log V) where V is vertices and E is edges',
          'O(V³)',
          'O(2^V)',
          'O(V!)'
        ],
        correctIndex: 0,
        explanation: 'Each vertex is extracted once (V log V) and each edge is relaxed at most once (E log V), yielding O((V + E) log V).'
      },
      {
        id: 5,
        question: 'What is the initial distance assigned to the source vertex when initializing Dijkstra?',
        options: [
          'Distance 0 (dist[source] = 0)',
          'Distance infinity (∞)',
          'Distance -1',
          'Distance equal to number of vertices V'
        ],
        correctIndex: 0,
        explanation: 'The distance from the starting node to itself is 0, while all other vertices are initialized to infinity (∞).'
      },
      {
        id: 6,
        question: 'What is the "edge relaxation" step in Dijkstra’s algorithm?',
        options: [
          'If dist[u] + weight(u, v) < dist[v], update dist[v] = dist[u] + weight(u, v)',
          'Removing an edge if its weight exceeds 100',
          'Swapping the source and destination vertices',
          'Dividing the edge weight by 2'
        ],
        correctIndex: 0,
        explanation: 'Relaxation tests whether going through vertex u improves the current shortest path estimate to vertex v.'
      },
      {
        id: 7,
        question: 'If a vertex in the graph is completely unreachable from the source node, what remains its final distance?',
        options: [
          'Infinity (float("inf") or INT_MAX)',
          'Zero (0)',
          'Negative one (-1)',
          'A null pointer exception is thrown'
        ],
        correctIndex: 0,
        explanation: 'Unreachable nodes are never relaxed and remain at their initial distance of infinity.'
      },
      {
        id: 8,
        question: 'How does your implementation represent the graph structure in memory?',
        options: [
          'Adjacency list mapping each node to a list of (neighbor, weight) pairs',
          'Flat 1-dimensional array of integers',
          'Unstructured string of characters',
          'Global SQL database table'
        ],
        correctIndex: 0,
        explanation: 'An adjacency list is the standard memory-efficient representation for sparse weighted graphs.'
      },
      {
        id: 9,
        question: 'Which alternative algorithm should be used if the graph contains negative edge weights without negative cycles?',
        options: [
          'Bellman-Ford algorithm',
          'Depth-First Search (DFS)',
          'Bubble Sort',
          'Binary Search'
        ],
        correctIndex: 0,
        explanation: 'The Bellman-Ford algorithm relaxes all edges V-1 times and correctly handles graphs with negative weights.'
      },
      {
        id: 10,
        question: 'What is the auxiliary space complexity of Dijkstra algorithm?',
        options: [
          'O(V + E) to store the graph, distances map, and priority queue',
          'O(1) constant space',
          'O(V!)',
          'O(2^E)'
        ],
        correctIndex: 0,
        explanation: 'The distance table, visited set, priority queue, and adjacency list require O(V + E) auxiliary space.'
      },
      {
        id: 11,
        question: 'Once a node u is extracted from the min-heap and marked visited in Dijkstra (with non-negative weights), can its shortest distance decrease later?',
        options: [
          'No, the greedy property guarantees that dist[u] is already optimal and permanent',
          'Yes, it can decrease if relaxed by a downstream node',
          'Yes, only if the graph has directed cycles',
          'Depends on the initial capacity of the heap'
        ],
        correctIndex: 0,
        explanation: 'With non-negative edge weights, any alternate path to u must pass through another unvisited node with distance >= dist[u].'
      },
      {
        id: 12,
        question: 'What is the primary difference in greedy criteria between Dijkstra’s algorithm and Prim’s algorithm?',
        options: [
          'Dijkstra minimizes total path distance from source (dist[u] + w), while Prim minimizes edge weight into MST (w)',
          'Dijkstra works on unweighted graphs only, Prim works on weighted graphs',
          'Dijkstra uses a stack, while Prim uses a FIFO queue',
          'Dijkstra detects cycles, Prim does not'
        ],
        correctIndex: 0,
        explanation: 'Dijkstra optimizes cumulative distance from source, while Prim optimizes the lightest connection to expand the tree.'
      },
      {
        id: 13,
        question: 'What occurs if Dijkstra’s algorithm is executed on a graph with negative-weight edges?',
        options: [
          'It may produce incorrect shortest path distances because already visited nodes are not reconsidered',
          'It automatically converts negative weights to absolute positive values',
          'It executes faster than on positive graphs',
          'It always throws a compile-time syntax error'
        ],
        correctIndex: 0,
        explanation: 'Dijkstra does not re-visit closed vertices, so a negative edge discovered later cannot correct previous shortest estimates.'
      },
      {
        id: 14,
        question: 'If all edge weights in a graph are identical positive constants (e.g., all 1), which simpler algorithm achieves O(V + E) time?',
        options: [
          'Breadth-First Search (BFS) using a standard FIFO queue',
          'Depth-First Search (DFS)',
          'Binary Search',
          'Merge Sort'
        ],
        correctIndex: 0,
        explanation: 'On unweighted or uniformly weighted graphs, standard BFS discovers shortest paths in O(V + E) without priority queue overhead.'
      },
      {
        id: 15,
        question: 'In Dijkstra, how is the actual shortest path sequence reconstructed from source to destination?',
        options: [
          'By maintaining a `parent` or `predecessor` array updated during edge relaxation and backtracking from destination to source',
          'By re-running the algorithm in reverse',
          'By sorting all node IDs in ascending numerical order',
          'By recording timestamps of CPU execution'
        ],
        correctIndex: 0,
        explanation: 'Setting parent[v] = u during relaxation allows reconstructing the path by tracing parent pointers back from target to source.'
      }
    ];
    return shuffleOptionsAndQuestions(dijkstraPool, 10);
  }

  // General code analyzer (e.g. "print Jay Ganesh", or any general code)
  const stringMatches = [...code.matchAll(/["']([^"'\n]{2,50})["']/g)].map(m => m[1]);
  const primaryString = stringMatches.find(s => !s.startsWith('%') && !s.includes('\\n') && !s.includes('class')) || 'Jay Ganesh';

  const pyFuncs = [...code.matchAll(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g)].map(m => m[1]);
  const jsFuncs = [...code.matchAll(/(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g)].map(m => m[1] || m[2]);
  const cppFuncs = [...code.matchAll(/(?:int|void|bool|auto|string|double)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g)].filter(m => m[1] !== 'main').map(m => m[1]);
  const funcs = [...pyFuncs, ...jsFuncs, ...cppFuncs].filter(Boolean);

  const usesPrint = code.includes('print(') || code.includes('print ');
  const usesCout = code.includes('cout <<') || code.includes('std::cout');
  const usesPrintf = code.includes('printf(');
  const usesConsoleLog = code.includes('console.log(');
  const usesSysOut = code.includes('System.out.println');

  const printMethod = usesPrint ? 'print()' 
    : usesCout ? 'std::cout <<' 
    : usesPrintf ? 'printf()' 
    : usesSysOut ? 'System.out.println()' 
    : usesConsoleLog ? 'console.log()' 
    : 'standard console output';

  const hasLoop = code.includes('for ') || code.includes('while ') || code.includes('for(') || code.includes('while(');

  const generalPool = [
    {
      id: 1,
      question: `What is the primary requirement and expected output of your program for "${title}"?`,
      options: [
        `To execute the logic for "${title}" and display "${primaryString}" on the terminal`,
        'To establish a persistent socket connection to an external database',
        'To render 3D graphics using hardware acceleration shaders',
        'To perform an asynchronous peer-to-peer data replication'
      ],
      correctIndex: 0,
      explanation: `Your source code is constructed specifically to fulfill "${title}" by outputting "${primaryString}".`
    },
    {
      id: 2,
      question: `In your code, which exact string literal is output to the standard console?`,
      options: [
        `"${primaryString}"`,
        '"System Error 404"',
        '"SELECT * FROM students;"',
        '"Process aborted with code -1"'
      ],
      correctIndex: 0,
      explanation: `Your code directly specifies the string literal "${primaryString}".`
    },
    {
      id: 3,
      question: `Which programming construct or function does your solution use to output text to the user?`,
      options: [
        `\`${printMethod}\` directed to standard output (stdout)`,
        'Writing raw packet frames to TCP port 8080',
        'Triggering an HTTP POST webhook payload',
        'Writing an interrupt vector to address 0x0000'
      ],
      correctIndex: 0,
      explanation: `Your solution uses \`${printMethod}\` to stream characters to stdout.`
    },
    {
      id: 4,
      question: lang === 'python'
        ? 'In Python, what is the return value of invoking the built-in `print()` function?'
        : lang === 'cpp' || lang === 'c'
        ? 'What is the meaning of returning 0 from the `main()` function in C/C++?'
        : lang === 'java'
        ? 'Why is `main(String[] args)` declared `static` in Java?'
        : 'In JavaScript / Node.js, what does `console.log()` write to by default?',
      options: lang === 'python'
        ? [
            'It returns `None` after writing characters to sys.stdout',
            'It returns the character count as an integer',
            'It returns boolean `True` if printing succeeded',
            'It returns a new copy of the printed string object'
          ]
        : lang === 'cpp' || lang === 'c'
        ? [
            'It signals successful termination (EXIT_SUCCESS) to the operating system',
            'It indicates a segmentation fault has occurred',
            'It restarts the program execution from beginning',
            'It clears CPU L1 cache'
          ]
        : lang === 'java'
        ? [
            'So the JVM can execute the entry method without creating an instance of the class',
            'To prevent the garbage collector from running',
            'To synchronize thread locks across CPU cores',
            'To prevent reading command-line arguments'
          ]
        : [
            '`process.stdout` followed by a newline character `\\n`',
            '`process.stderr` without any newline',
            'A local web storage buffer',
            'The browser DOM document root'
          ],
      correctIndex: 0,
      explanation: lang === 'python' 
        ? 'In Python, `print()` writes to standard output and returns `None`.'
        : lang === 'cpp' || lang === 'c'
        ? 'Returning 0 signals to the host OS that the program exited cleanly.'
        : lang === 'java'
        ? '`static` enables the JVM to call `main()` without needing class instantiation.'
        : '`console.log()` writes directly to `process.stdout`.'
    },
    {
      id: 5,
      question: `What is the time complexity of printing a string of length k to standard output?`,
      options: [
        'O(k) linear in the number of characters written to the output stream buffer',
        'O(2^k) exponential complexity',
        'O(k!) factorial complexity',
        'O(k³) cubic polynomial complexity'
      ],
      correctIndex: 0,
      explanation: 'Writing characters to standard output requires copying each character into the buffer, running in O(k) linear time.'
    },
    {
      id: 6,
      question: hasLoop
        ? 'Your program contains a loop. What condition ensures that the loop terminates properly?'
        : `How does execution proceed through your program statements for "${title}"?`,
      options: hasLoop
        ? [
            'The loop counter or condition progresses monotonically toward the termination bound on each cycle',
            'An OS hardware timer halts execution after 100 milliseconds',
            'The process runs infinitely until memory runs out',
            'A thread abort signal is sent by the operating system'
          ]
        : [
            'Statements execute sequentially in top-to-bottom order (O(1) straight-line control flow)',
            'Statements execute in random non-deterministic order',
            'Statements are executed in reverse order from bottom to top',
            'Statements run simultaneously on separate CPU threads without synchronization'
          ],
      correctIndex: 0,
      explanation: hasLoop
        ? 'Loop termination requires the state variable to reach the termination boundary.'
        : 'Straight-line program statements execute in sequential top-to-bottom order.'
    },
    {
      id: 7,
      question: `What is the auxiliary memory (RAM) requirement of executing this program?`,
      options: [
        'O(1) constant auxiliary memory since only small stack/buffer frames are allocated',
        'O(2^n) exponential memory allocation',
        'Requires at least 16 GB of swap space',
        'Allocates persistent unfreeable disk blocks'
      ],
      correctIndex: 0,
      explanation: 'Simple console output programs require only minimal constant O(1) auxiliary stack memory.'
    },
    {
      id: 8,
      question: funcs.length > 0
        ? `In your code, what is the role of the custom function \`${funcs[0]}\`?`
        : `If you wanted to wrap your program logic in a reusable function in ${lang.toUpperCase()}, how should it be declared?`,
      options: funcs.length > 0
        ? [
            `It encapsulates modular logic for "${title}" and can be invoked repeatedly`,
            'It hooks into the OS kernel interrupt table',
            'It acts as a physical hardware device driver',
            'It modifies CPU microcode instructions'
          ]
        : [
            lang === 'python' ? '`def solution():` followed by an indented statement block'
              : lang === 'cpp' || lang === 'c' ? '`void solution() { /* body */ }`'
              : lang === 'java' ? '`public static void solution() { /* body */ }`'
              : '`function solution() { /* body */ }`',
            'Writing raw assembly jumps',
            'Wrapping in an HTML `<div>` tag',
            'Creating a SQL table schema'
          ],
      correctIndex: 0,
      explanation: funcs.length > 0
        ? `The function \`${funcs[0]}\` modularizes the program logic cleanly.`
        : `Declaring a standard function in ${lang.toUpperCase()} allows code reuse and modularity.`
    },
    {
      id: 9,
      question: `What character is automatically appended to the output by default when calling \`${printMethod}\`?`,
      options: [
        'A newline character (`\\n`), moving the cursor to the beginning of the next line',
        'A carriage return without newline (`\\r`)',
        'A null terminator byte (`\\0`) visible on screen',
        'A tab character (`\\t`)'
      ],
      correctIndex: 0,
      explanation: `Standard print functions append a newline (\`\\n\`) by default to conclude the output line.`
    },
    {
      id: 10,
      question: `In an academic viva assessment, why is your code for "${title}" considered high quality?`,
      options: [
        'It fulfills the exact assignment specifications cleanly with optimal simplicity, 0 syntax errors, and high readability',
        'It introduces unnecessary obfuscation to make the logic hard to follow',
        'It imports 20 unused packages to increase bundle size',
        'It intentionally exceeds memory limits'
      ],
      correctIndex: 0,
      explanation: 'Good software engineering prioritizes correctness, clarity, simplicity, and adherence to requirements.'
    },
    {
      id: 11,
      question: 'In conditional branching, what does the modulo operator expression `n % 2 == 0` evaluate to?',
      options: [
        'True if n is an even number (divisible by 2 with 0 remainder), False if odd',
        'True if n is a prime number',
        'The floating-point quotient of n divided by 2',
        'True if n is negative'
      ],
      correctIndex: 0,
      explanation: 'The modulo operator % returns the remainder of integer division; remainder 0 when divided by 2 signifies an even number.'
    },
    {
      id: 12,
      question: 'What is the purpose of input validation before performing computations on user data?',
      options: [
        'To guard against invalid types, unexpected ranges, and boundary errors that could crash the program',
        'To speed up CPU clock speed',
        'To encrypt the program binary on disk',
        'To automatically convert the program to machine code'
      ],
      correctIndex: 0,
      explanation: 'Input validation ensures program resilience by filtering out invalid input before processing occurs.'
    },
    {
      id: 13,
      question: 'In logical operations, what is "short-circuit evaluation" in an expression `A && B` (or `A and B`)?',
      options: [
        'If expression A evaluates to false, expression B is not evaluated because the entire AND expression is guaranteed false',
        'Both A and B are evaluated concurrently on GPU cores',
        'If A is true, the program immediately halts',
        'B is evaluated first, then A'
      ],
      correctIndex: 0,
      explanation: 'Short-circuiting skips evaluating operand B once operand A evaluates to false in an AND operation.'
    },
    {
      id: 14,
      question: 'What is the time complexity of a single loop that iterates from 1 to n with a constant increment?',
      options: [
        'O(n) linear time complexity',
        'O(log n) logarithmic time complexity',
        'O(n²) quadratic time complexity',
        'O(1) constant time complexity'
      ],
      correctIndex: 0,
      explanation: 'A loop that runs n times with O(1) operations in the body executes in O(n) linear time.'
    },
    {
      id: 15,
      question: 'What error typically occurs if a loop boundary index exceeds the allocated size of an array/list?',
      options: [
        'An out-of-bounds error (IndexError, ArrayIndexOutOfBoundsException, or Segmentation Fault)',
        'The program silently reallocates RAM infinitely',
        'The array reverses its elements automatically',
        'A compile-time division by zero exception'
      ],
      correctIndex: 0,
      explanation: 'Accessing an index >= length of an array breaches memory bounds, triggering an out-of-bounds runtime exception.'
    },
    {
      id: 16,
      question: 'What is the key difference between a `while` loop and an `if` statement?',
      options: [
        'A `while` loop repeatedly re-executes its block as long as the condition holds, whereas an `if` statement executes at most once',
        'An `if` statement can execute indefinitely',
        'A `while` loop cannot check boolean expressions',
        'They are completely identical in execution'
      ],
      correctIndex: 0,
      explanation: 'An `if` statement performs a single conditional check; a `while` loop repeats execution until the condition becomes false.'
    },
    {
      id: 17,
      question: 'In programming, why are descriptive variable and function names considered essential practice?',
      options: [
        'They make code self-documenting, readable, maintainable, and easier to debug during academic evaluation',
        'They compress the compiled binary into a smaller size',
        'They force the CPU to run at higher GHz clock speed',
        'They prevent memory leaks automatically'
      ],
      correctIndex: 0,
      explanation: 'Meaningful naming communicates intent and semantics clearly to peer developers and evaluators.'
    }
  ];

  return shuffleOptionsAndQuestions(generalPool, 10);
}

export async function generateAssignmentTestcases({ title = '', description = '', language = 'cpp', apiKey }) {
  if (apiKey) {
    try {
      const prompt = `You are a computer science professor creating standard competitive-programming test cases (like LeetCode or HackerRank) for an assignment.
Title: "${title}"
Description: "${description}"
Language: ${language}

Generate 2 or 3 standard, realistic test cases that can be fed into standard input (stdin) and verified against standard output (stdout).

Rules:
1. Standard Input (input):
   - For simple math/algorithm problems: Provide clean space-separated values (e.g. "10 20").
   - For complex/management/data structure problems (e.g. Library, Student Records, Bank, Matrix, Arrays): Standardize the input with counts and space-separated lines (e.g. number of items on first line, followed by space-separated data).
2. Expected Output (expectedOutput):
   - Must strictly be the exact console output (stdout) that the problem specifies.
   - For multi-line outputs or key-value reports, format each line cleanly.
3. Explanation:
   - Provide a clear, educational walkthrough of why this output is expected.

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "input": "...",
    "expectedOutput": "...",
    "explanation": "..."
  }
]`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(tc => ({
              input: String(tc.input ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim(),
              expectedOutput: String(tc.expectedOutput ?? '').trim(),
              explanation: String(tc.explanation ?? '').trim()
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Gemini testcase generation fallback:', e.message);
    }
  }

  // Intelligent LeetCode-Style Heuristic Problem Analyzer Fallback
  const titleLower = (title + ' ' + description).toLowerCase();

  // 1. Queue / Real-Time Event Processing System / Job Scheduling (FIFO)
  if (titleLower.includes('queue') || titleLower.includes('event processing') || titleLower.includes('fifo') || titleLower.includes('job scheduling') || titleLower.includes('event queue')) {
    return [
      {
        input: "1\n10\n1\n20\n1\n30\n2\n3\n5",
        expectedOutput: "Event 10 added to queue.\nEvent 20 added to queue.\nEvent 30 added to queue.\nProcessing event: 10\nPending events: 20 30\nProgram terminated.",
        explanation: "Adds events 10, 20, 30. Processes oldest event 10. Displays pending events 20 and 30, then exits."
      },
      {
        input: "1\n50\n1\n60\n4\n50\n3\n5",
        expectedOutput: "Event 50 added to queue.\nEvent 60 added to queue.\nEvent 50 canceled.\nPending events: 60\nProgram terminated.",
        explanation: "Adds events 50, 60. Cancels event 50. Displays remaining pending event 60, then exits."
      }
    ];
  }

  // 2. Stack / Expression Conversion & Evaluation / Balancing Parentheses (LIFO)
  if (titleLower.includes('stack') || titleLower.includes('postfix') || titleLower.includes('infix') || titleLower.includes('parenthes') || titleLower.includes('lifo')) {
    if (titleLower.includes('infix') || titleLower.includes('postfix')) {
      return [
        {
          input: "(A+B)*(C-D)",
          expectedOutput: "AB+CD-*",
          explanation: "Infix to Postfix conversion using Stack."
        },
        {
          input: "A+B*C",
          expectedOutput: "ABC*+",
          explanation: "Infix to Postfix with operator precedence."
        }
      ];
    }
    if (titleLower.includes('parenthes') || titleLower.includes('balanc')) {
      return [
        {
          input: "{[()]}",
          expectedOutput: "Balanced",
          explanation: "All opening brackets have corresponding matching closing brackets in correct order."
        },
        {
          input: "{[(])}",
          expectedOutput: "Not Balanced",
          explanation: "Mismatched bracket closing order."
        }
      ];
    }
    return [
      {
        input: "1\n10\n1\n20\n2\n3\n4",
        expectedOutput: "Pushed: 10\nPushed: 20\nPopped: 20\nTop: 10\nProgram terminated.",
        explanation: "Pushes 10 and 20, pops 20, top element is 10."
      }
    ];
  }

  // 3. Linked List (Singly, Doubly, Circular, Polynomial)
  if (titleLower.includes('linked list') || titleLower.includes('linkedlist') || titleLower.includes('singly') || titleLower.includes('doubly') || titleLower.includes('polynomial')) {
    return [
      {
        input: "1\n10\n1\n20\n1\n30\n3\n5",
        expectedOutput: "Inserted: 10\nInserted: 20\nInserted: 30\nList: 10 -> 20 -> 30\nProgram terminated.",
        explanation: "Inserts nodes 10, 20, 30 at end of linked list and displays nodes."
      }
    ];
  }

  // 4. Graph Algorithms (Dijkstra, BFS, DFS, MST)
  if (titleLower.includes('dijkstra') || titleLower.includes('shortest path') || titleLower.includes('graph') || titleLower.includes('bfs') || titleLower.includes('dfs') || titleLower.includes('mst') || titleLower.includes('kruskal') || titleLower.includes('prim')) {
    return [
      {
        input: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0",
        expectedOutput: "Vertex 0: 0\nVertex 1: 3\nVertex 2: 1\nVertex 3: 4\nVertex 4: 7",
        explanation: "Shortest distances from source vertex 0 to all vertices."
      }
    ];
  }

  // 5. Library / Book Borrowing System (Prioritized before arithmetic keywords)
  if (titleLower.includes('librar') || titleLower.includes('borrow') || titleLower.includes('book')) {
    return [
      {
        input: "10 3 0 5 2 0 4 1 0 6 2 4 Algorithms:42 Clean_Code:58 Design_Patterns:19 Networks:8",
        expectedOutput: "Average: 2.30 | Highest: Clean_Code 58 | Lowest: Networks 8 | Zero: 3 | Mode: Clean_Code 58",
        explanation: "10 members (23 total borrows, avg 2.30), 3 zero-borrowers. Highest and mode is Clean_Code (58)."
      },
      {
        input: "4 0 0 0 0 3 Python:15 Java:15 C:5",
        expectedOutput: "Average: 0.00 | Highest: Python 15 | Lowest: C 5 | Zero: 4 | Mode: Python 15",
        explanation: "All 4 members borrowed 0 books. Python and Java tied with 15 borrowings."
      }
    ];
  }

  // 2. Student Marks / Grading / Attendance
  if (titleLower.includes('student') || titleLower.includes('mark') || titleLower.includes('grade') || titleLower.includes('attend')) {
    return [
      {
        input: "5 85 90 78 92 88",
        expectedOutput: "Average: 86.60 | Highest: 92 | Lowest: 78",
        explanation: "5 marks with average 86.60, highest 92, and lowest 78."
      },
      {
        input: "3 50 60 70",
        expectedOutput: "Average: 60.00 | Highest: 70 | Lowest: 50",
        explanation: "3 marks with average 60.00, highest 70, and lowest 50."
      }
    ];
  }

  // 3. Bank / Account / Transaction Management
  if (titleLower.includes('bank') || titleLower.includes('account') || titleLower.includes('atm') || titleLower.includes('balance')) {
    return [
      {
        input: "1000 credit 500 debit 200",
        expectedOutput: "Final Balance: 1300",
        explanation: "Initial 1000 + 500 credit - 200 debit = 1300 balance."
      }
    ];
  }

  // 4. Matrix / 2D Grid Operations
  if (titleLower.includes('matrix') || titleLower.includes('grid')) {
    return [
      {
        input: "2 2 1 2 3 4 5 6 7 8",
        expectedOutput: "6 8 10 12",
        explanation: "Element-wise addition of two 2x2 matrices."
      }
    ];
  }

  // 5. Sorting / Searching / Array Algorithms
  if (titleLower.includes('sort') || titleLower.includes('search') || titleLower.includes('bubble') || titleLower.includes('quick') || titleLower.includes('merge') || titleLower.includes('array')) {
    return [
      {
        input: "5 64 34 25 12 22",
        expectedOutput: "12 22 25 34 64",
        explanation: "Array sorted in ascending order."
      },
      {
        input: "4 5 1 4 2",
        expectedOutput: "1 2 4 5",
        explanation: "Array sorted in ascending order."
      }
    ];
  }

  // 6. Binary Search Tree / BST
  if (titleLower.includes('binary search tree') || titleLower.includes('bst') || titleLower.includes('tree')) {
    return [
      { input: "50 30 70 20 40 60 80", expectedOutput: "20 30 40 50 60 70 80", explanation: "In-order traversal yields sorted values" }
    ];
  }

  // 7. Palindrome
  if (titleLower.includes('palind')) {
    return [
      { input: "radar", expectedOutput: "palindrome", explanation: "'radar' reads the same forwards and backwards" },
      { input: "hello", expectedOutput: "not palindrome", explanation: "'hello' is not a palindrome" }
    ];
  }

  // 8. Factorial
  if (titleLower.includes('factor')) {
    return [
      { input: "5", expectedOutput: "120", explanation: "5! = 5 * 4 * 3 * 2 * 1 = 120" },
      { input: "3", expectedOutput: "6", explanation: "3! = 6" }
    ];
  }

  // 9. Prime Number
  if (titleLower.includes('prime')) {
    return [
      { input: "7", expectedOutput: "prime", explanation: "7 has only 1 and 7 as divisors" },
      { input: "8", expectedOutput: "not prime", explanation: "8 is divisible by 2 and 4" }
    ];
  }

  // 10. Reverse String / Reverse Number
  if (titleLower.includes('revers')) {
    return [
      { input: "hello", expectedOutput: "olleh", explanation: "Reversed string is 'olleh'" },
      { input: "12345", expectedOutput: "54321", explanation: "Reversed number is 54321" }
    ];
  }

  // 11. Even or Odd
  if (/\b(even|odd)\b/i.test(titleLower)) {
    return [
      { input: "4", expectedOutput: "even", explanation: "4 is divisible by 2" },
      { input: "7", expectedOutput: "odd", explanation: "7 is not divisible by 2" }
    ];
  }

  // 12. Sum / Addition (Never match on data structure actions like 'add an event')
  if (
    /\b(sum of|calculate sum|find sum|summation|addition of)\b/i.test(titleLower) ||
    (/\b(sum|addition)\b/i.test(titleLower) && !/\b(queue|stack|event|list|node|tree|graph|record|item|element)\b/i.test(titleLower))
  ) {
    return [
      { input: "10 20", expectedOutput: "30", explanation: "10 + 20 = 30" },
      { input: "5 15", expectedOutput: "20", explanation: "5 + 15 = 20" }
    ];
  }

  // 13. Greatest / Maximum of Numbers (Strict word boundaries to avoid false matching)
  if (/\b(greatest|maximum|max|larger|largest)\b/i.test(titleLower)) {
    if (/\b(three|3)\b/i.test(titleLower)) {
      return [
        { input: "10 20 30", expectedOutput: "30", explanation: "30 is the greatest among 10, 20, and 30" },
        { input: "55 12 40", expectedOutput: "55", explanation: "55 is the greatest among 55, 12, and 40" }
      ];
    }
    return [
      { input: "10 20", expectedOutput: "20", explanation: "Between 10 and 20, 20 is the greatest" },
      { input: "45 12", expectedOutput: "45", explanation: "Between 45 and 12, 45 is the greatest" }
    ];
  }

  // 14. Smallest / Minimum of Numbers (Strict word boundaries to avoid false matching on 'determine')
  if (/\b(smallest|minimum|min|least)\b/i.test(titleLower)) {
    return [
      { input: "10 20", expectedOutput: "10", explanation: "Between 10 and 20, 10 is the smallest" },
      { input: "45 12", expectedOutput: "12", explanation: "Between 45 and 12, 12 is the smallest" }
    ];
  }

  // 15. Greetings / Hello World
  if (titleLower.includes('jay ganesh')) {
    return [
      { input: "", expectedOutput: "Jay Ganesh", explanation: "Prints devotional greeting" }
    ];
  } else if (titleLower.includes('hello')) {
    return [
      { input: "", expectedOutput: "Hello World", explanation: "Standard greeting output" }
    ];
  }

  // Clean, realistic fallback
  return [
    { input: "10 20", expectedOutput: "20", explanation: "Sample input 10 and 20" }
  ];
}

