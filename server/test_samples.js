import { compareCode, runTier1Check } from './plagiarism/winnowing.js';
import { db } from './db.js';

const pastSub = db.getSubmissions()[0];

const uniqueCode = `class TreeNode:
    def __init__(self, key):
        self.key = key
        self.left_child = None
        self.right_child = None

class BinarySearchTree:
    def __init__(self):
        self.root_node = None

    def insert(self, key):
        def _rec_insert(curr, key):
            if not curr:
                return TreeNode(key)
            if key < curr.key:
                curr.left_child = _rec_insert(curr.left_child, key)
            elif key > curr.key:
                curr.right_child = _rec_insert(curr.right_child, key)
            return curr
        self.root_node = _rec_insert(self.root_node, key)

    def search(self, key):
        curr = self.root_node
        while curr and curr.key != key:
            curr = curr.left_child if key < curr.key else curr.right_child
        return curr is not None

    def in_order(self):
        res, stack = [], []
        curr = self.root_node
        while curr or stack:
            while curr:
                stack.append(curr)
                curr = curr.left_child
            curr = stack.pop()
            res.append(curr.key)
            curr = curr.right_child
        return res
`;

const borderlineCode = `class TreeNode:
    def __init__(self, item=0, left=None, right=None):
        self.val = item
        self.left = left
        self.right = right

class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, new_val):
        if self.root is None:
            self.root = TreeNode(new_val)
            return
        current_node = self.root
        while True:
            if new_val < current_node.val:
                if current_node.left is None:
                    current_node.left = TreeNode(new_val)
                    break
                current_node = current_node.left
            elif new_val > current_node.val:
                if current_node.right is None:
                    current_node.right = TreeNode(new_val)
                    break
                current_node = current_node.right
            else:
                break

    def search(self, target):
        current_node = self.root
        while current_node is not None:
            if current_node.val == target:
                return True
            elif target < current_node.val:
                current_node = current_node.left
            else:
                current_node = current_node.right
        return False

    def in_order(self):
        result_list = []
        def traverse_tree(curr):
            if not curr: return
            traverse_tree(curr.left)
            result_list.append(curr.val)
            traverse_tree(curr.right)
        traverse_tree(self.root)
        return result_list
`;

const resUnique = runTier1Check(uniqueCode, [pastSub]);
const resBorderline = runTier1Check(borderlineCode, [pastSub]);
const resCopied = runTier1Check(pastSub.code, [pastSub]);

console.log('Unique Code ->', resUnique.score + '%', resUnique.status, 'verdict:', resUnique.verdict);
console.log('Borderline Code ->', resBorderline.score + '%', resBorderline.status, 'verdict:', resBorderline.verdict);
console.log('Copied Code ->', resCopied.score + '%', resCopied.status, 'verdict:', resCopied.verdict);
