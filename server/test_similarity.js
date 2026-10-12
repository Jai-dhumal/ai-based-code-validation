// test_similarity.js — Test that Tier-1 plagiarism engine detects similarity
// against existing sub_omkar_bst submission in database.json
import { runTier1Check } from './plagiarism/winnowing.js';
import { db } from './db.js';

const existingSubs = db.getSubmissions();
console.log(`\n📦 Existing submissions in DB: ${existingSubs.length}`);
existingSubs.forEach(s => console.log(`   → ${s.id} | student: ${s.studentId}`));

// ─── Test 1: Modified BST (should flag HIGH similarity) ────────────────────
const copiedBST = `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class BST:
    def __init__(self):
        self.root = None

    def insert(self, val):
        if not self.root:
            self.root = TreeNode(val)
            return
        curr = self.root
        while True:
            if val < curr.val:
                if not curr.left:
                    curr.left = TreeNode(val)
                    break
                curr = curr.left
            elif val > curr.val:
                if not curr.right:
                    curr.right = TreeNode(val)
                    break
                curr = curr.right
            else:
                break

    def search(self, val):
        curr = self.root
        while curr:
            if curr.val == val:
                return True
            elif val < curr.val:
                curr = curr.left
            else:
                curr = curr.right
        return False`;

const result1 = await runTier1Check(copiedBST, existingSubs);
console.log('\n🔴 [COPIED BST - Slightly Modified] Tier-1 Result:');
console.log(`   Score:   ${result1.score}%`);
console.log(`   Status:  ${result1.status}`);
console.log(`   Verdict: ${result1.verdict}`);
console.log(`   Matched: ${result1.mostSimilarSubmission?.id || 'none'}`);
console.log(`   Requires Tier-2: ${result1.requiresTier2}`);

// ─── Test 2: Dijkstra (completely different — should be CLEAN) ─────────────
const dijkstraCode = `import heapq
def dijkstra(graph, start_node):
    dist = {start_node: 0}
    pq = [(0, start_node)]
    while pq:
        d, u = heapq.heappop(pq)
        for v, w in graph.get(u, []):
            if dist.get(v, float('inf')) > d + w:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))
    return dist`;

const result2 = await runTier1Check(dijkstraCode, existingSubs);
console.log('\n🟢 [DIFFERENT CODE - Dijkstra] Tier-1 Result:');
console.log(`   Score:   ${result2.score}%`);
console.log(`   Status:  ${result2.status}`);
console.log(`   Verdict: ${result2.verdict}`);

// ─── Test 3: Exact copy (should be 100%) ──────────────────────────────────
const exactCopy = existingSubs[0]?.code || '';
const result3 = await runTier1Check(exactCopy, existingSubs);
console.log('\n🔴 [EXACT COPY of Omkar BST] Tier-1 Result:');
console.log(`   Score:   ${result3.score}%`);
console.log(`   Status:  ${result3.status}`);
console.log(`   Verdict: ${result3.verdict}`);

// ─── Summary ───────────────────────────────────────────────────────────────
console.log('\n========================================================');
const test1Pass = result1.score > 50;
const test2Pass = result2.score < 30;
const test3Pass = result3.score > 80;
console.log(`✅/❌ Test 1 (Copied BST flagged as similar): ${test1Pass ? '✅ PASS' : '❌ FAIL'} (score=${result1.score}%, expected >50%)`);
console.log(`✅/❌ Test 2 (Dijkstra is clean):            ${test2Pass ? '✅ PASS' : '❌ FAIL'} (score=${result2.score}%, expected <30%)`);
console.log(`✅/❌ Test 3 (Exact copy flagged high):      ${test3Pass ? '✅ PASS' : '❌ FAIL'} (score=${result3.score}%, expected >80%)`);
const allPass = test1Pass && test2Pass && test3Pass;
console.log(`\n📊 SIMILARITY DETECTION: ${allPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
console.log('========================================================\n');
process.exit(allPass ? 0 : 1);
