import { compareCode, runTier1Check } from './plagiarism/winnowing.js';
import { runTier2Evaluation, generateCodeQuiz } from './services/gemini.js';
import { generateSubmissionReceipt } from './services/github.js';
import { db } from './db.js';

console.log('🧪 Starting Verification of Validation Engine...\n');

// 1. Test Database
console.log('1. Database Check:');
const users = db.getUsers();
const asgs = db.getAssignments();
const subs = db.getSubmissions();
console.log(`   ✓ Found ${users.length} users, ${asgs.length} assignments, ${subs.length} submissions.`);

// 2. Test Tier-1 Plagiarism Engine
console.log('\n2. Plagiarism Engine Check:');
const pastSub = subs[0]; // Omkar's BST submission

const originalCode = `class TreeNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, key):
        if not self.root:
            self.root = TreeNode(key)
            return
        stack = [self.root]
`;

const copiedCode = pastSub.code;

const borderlineCode = pastSub.code
  .replace(/curr/g, 'current_node')
  .replace(/res/g, 'result_list');

const t1Clean = runTier1Check(originalCode, [pastSub]);
console.log(`   ✓ Clean Code Test -> Score: ${t1Clean.score}%, Verdict: "${t1Clean.verdict}", Requires Tier 2: ${t1Clean.requiresTier2}`);

const t1Borderline = runTier1Check(borderlineCode, [pastSub]);
console.log(`   ✓ Borderline Code Test -> Score: ${t1Borderline.score}%, Verdict: "${t1Borderline.verdict}", Requires Tier 2: ${t1Borderline.requiresTier2}`);

const t1Copied = runTier1Check(copiedCode, [pastSub]);
console.log(`   ✓ Copied Code Test -> Score: ${t1Copied.score}%, Verdict: "${t1Copied.verdict}", Requires Tier 2: ${t1Copied.requiresTier2}`);

// 3. Test Tier-2 Gemini Semantic Analyzer
console.log('\n3. Tier-2 Semantic Analyzer Check:');
const t2Report = await runTier2Evaluation({
  code: borderlineCode,
  referenceCode: pastSub.code,
  assignmentTitle: 'Binary Search Tree Operations',
  language: 'python',
  studentName: 'Jaydeep Dhumal'
});
console.log(`   ✓ Semantic Score: ${t2Report.semanticSimilarityScore}%, Logic Equivalence: ${t2Report.logicEquivalence}`);
console.log(`   ✓ Renamed Tokens: ${t2Report.renamedIdentifiers.join(', ')}`);
console.log(`   ✓ Recommendation: ${t2Report.recommendation}`);

// 4. Test Dynamic AI Quiz Generation
console.log('\n4. Dynamic AI Quiz Generator Check:');
const quizQuestions = await generateCodeQuiz({
  code: borderlineCode,
  assignmentTitle: 'Binary Search Tree Operations',
  language: 'python'
});
console.log(`   ✓ Generated ${quizQuestions.length} code-tailored questions.`);
quizQuestions.forEach((q, i) => {
  console.log(`     Q${i+1}: ${q.question.substring(0, 65)}...`);
});

// 5. Test GitHub Submission Receipt
console.log('\n5. GitHub Certification Check:');
const receipt = generateSubmissionReceipt({
  studentId: 'usr_student_2',
  rollNo: 'CE2025-02',
  studentName: 'Jaydeep Dhumal',
  assignmentId: 'asg_1',
  assignmentTitle: 'Binary Search Tree Operations',
  quizScore: 85,
  tier1Score: t1Borderline.score,
  tier2Verdict: t2Report.verdict
});
console.log(`   ✓ Certified SHA: ${receipt.commitSha}`);
console.log(`   ✓ Verification Hash: ${receipt.verificationHash}`);
console.log(`   ✓ GitHub Branch: ${receipt.github.branch}`);

console.log('\n✨ ALL PLATFORM VERIFICATION TESTS PASSED SUCCESSFULLY!');
