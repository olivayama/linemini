// Usage: node devtools/build-test-doc.mjs <input-base> <output-base> <pattern...>
//
// 例:
//   node devtools/build-test-doc.mjs apps/api docs/testing/api \
//     'services/**/*.ix_test.ts'
//   node devtools/build-test-doc.mjs apps/web docs/testing/web \
//     'stdutils/**/*.test.ts' 'utils/**/*.test.ts' 'hooks/**/*.ix_test.tsx' \
//     'components/**/*.test.tsx'
//
// <input-base> 配下の test ファイルを <pattern...>(** は任意階層)で走査し、
// describe / it を抽出して <output-base>/<input-base からの相対パス>.md として出力する。
//
// app(api/web)に依存しない汎用ツール。describe 階層は固定せず、インデント幅で
// 階層を判定して tree を組み立てる(単層〜多層が混在しても良い)。prettier 整形を
// 前提(2-space indent)。出力構造は source 構造を mirror する。

import fs from "node:fs/promises";
import path from "node:path";

const [, , inputBase, outputBase, ...patterns] = process.argv;

if (!inputBase || !outputBase || patterns.length === 0) {
  console.error(
    "Usage: node devtools/build-test-doc.mjs <input-base> <output-base> <pattern...>",
  );
  process.exit(1);
}

// describe / it / test の bare 形を認識する。
// 注:
// - `.skip`(無効化テスト) / `.only` は意図的に拾わない。doc は「実際にテストしている
//   項目」の一覧なので、無効化された項目は載せない(`.only` はそもそも commit しない前提)。
// - `it.each` / `describe.each`(第 1 引数が配列でタイトル位置が異なる)は未対応。
//   パラメタライズドを項目化したい場合は個別の `it` で書く。
const DESCRIBE_RE = /^(\s*)describe\(\s*(['"`])(.*?)\2\s*,/;
const IT_RE = /^(\s*)(?:it|test)\(\s*(['"`])(.*?)\2\s*,/;

const extractItems = (source) => {
  const items = [];
  for (const line of source.split("\n")) {
    const d = line.match(DESCRIBE_RE);
    if (d) {
      items.push({ type: "describe", name: d[3], indent: d[1].length });
      continue;
    }
    const i = line.match(IT_RE);
    if (i) {
      items.push({ type: "it", name: i[3], indent: i[1].length });
    }
  }
  return items;
};

// items を indent から tree に組み立てる。
// 戻り値は root.children: [{ type, name, children?: [...] }]
const buildTree = (items) => {
  const root = { type: "root", children: [] };
  const stack = [{ node: root, indent: -1 }];

  for (const item of items) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= item.indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    if (item.type === "describe") {
      const node = { type: "describe", name: item.name, children: [] };
      parent.children.push(node);
      stack.push({ node, indent: item.indent });
    } else {
      parent.children.push({ type: "it", name: item.name });
    }
  }

  return root.children;
};

// tree を markdown 行配列に変換する。
// 各 describe ノードでは「直下の it を先に列挙 → ネストした describe を後で展開」して
// 視覚的に整理する(テスト実行順とは異なる場合がある)。
const renderTree = (nodes, depth) => {
  const lines = [];
  const its = nodes.filter((n) => n.type === "it");
  const describes = nodes.filter((n) => n.type === "describe");

  for (const it of its) {
    lines.push(`- ${it.name}`);
  }
  if (its.length > 0 && describes.length > 0) lines.push("");

  for (let i = 0; i < describes.length; i++) {
    const d = describes[i];
    lines.push(`${"#".repeat(depth + 1)} ${d.name}`, "");
    lines.push(...renderTree(d.children, depth + 1));
    if (i < describes.length - 1) lines.push("");
  }

  return lines;
};

const buildDoc = (items, fallbackTitle) => {
  const tree = buildTree(items);
  if (tree.length === 0) return null;

  const topDescribes = tree.filter((n) => n.type === "describe");
  const topIts = tree.filter((n) => n.type === "it");

  const sections = [];

  if (topDescribes.length === 0) {
    // top-level it のみ。ファイル名を見出しに使う
    sections.push(`# ${fallbackTitle}`, "");
    for (const it of topIts) sections.push(`- ${it.name}`);
    return sections.join("\n") + "\n";
  }

  if (topIts.length > 0) {
    // top-level it と describe が混在 → 仮見出しでまとめる
    sections.push(`# ${fallbackTitle}`, "");
    for (const it of topIts) sections.push(`- ${it.name}`);
    sections.push("");
    for (const d of topDescribes) {
      sections.push(`## ${d.name}`, "");
      sections.push(...renderTree(d.children, 2));
      sections.push("");
    }
    return sections.join("\n").replace(/\n+$/, "\n");
  }

  // 通常ケース: 各 top-level describe を h1 セクションに
  for (let i = 0; i < topDescribes.length; i++) {
    const d = topDescribes[i];
    sections.push(`# ${d.name}`, "");
    sections.push(...renderTree(d.children, 1));
    if (i < topDescribes.length - 1) sections.push("");
  }
  return sections.join("\n").replace(/\n+$/, "\n");
};

// glob 風パターンを再帰列挙
const walkPattern = async (base, pattern) => {
  // pattern: 'utils/**/*.test.ts' のような形式(** は任意階層)
  const segments = pattern.split("/");

  const result = [];

  const walk = async (currentDir, segIdx) => {
    if (segIdx === segments.length) return;
    const seg = segments[segIdx];
    const isLast = segIdx === segments.length - 1;
    const absDir = path.join(base, currentDir);

    let entries;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    if (seg === "**") {
      // 現階層を含むすべての階層で残りパターンを試す
      await walk(currentDir, segIdx + 1);
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await walk(path.join(currentDir, entry.name), segIdx);
        }
      }
      return;
    }

    const regex = new RegExp(
      "^" + seg.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
    );
    for (const entry of entries) {
      if (!regex.test(entry.name)) continue;
      if (isLast) {
        if (entry.isFile()) {
          result.push(path.join(currentDir, entry.name));
        }
      } else if (entry.isDirectory()) {
        await walk(path.join(currentDir, entry.name), segIdx + 1);
      }
    }
  };

  await walk(".", 0);
  return result;
};

const collectFiles = async () => {
  const all = new Set();
  for (const pattern of patterns) {
    const found = await walkPattern(inputBase, pattern);
    for (const f of found) all.add(f);
  }
  return [...all].sort();
};

// source ファイル名をそのまま mirror し、拡張子だけ .md にする。
// .test / .ix_test の lane を残すことで、同一 dir の unit/結合が同名 .md に衝突しない。
const toDocPath = (relPath) => relPath.replace(/\.(ts|tsx)$/, ".md");

const files = await collectFiles();
if (files.length === 0) {
  // 0 件でも README(空一覧)は生成して正常終了する。
  // テンプレ派生直後のまだテストを書いていない案件で make gen/doc を壊さないため。
  console.warn(
    `No test files found under ${inputBase} for patterns: ${patterns.join(
      ", ",
    )} (README のみ生成)`,
  );
}

await fs.mkdir(outputBase, { recursive: true });

const generated = [];
for (const rel of files) {
  const abs = path.join(inputBase, rel);
  const source = await fs.readFile(abs, "utf-8");
  const items = extractItems(source);
  const baseName = path
    .basename(rel)
    .replace(/\.(test|ix_test)\.(ts|tsx)$/, "");
  const doc = buildDoc(items, baseName);
  if (doc == null) {
    console.warn(`skip: ${abs} (no describe/it found)`);
    continue;
  }
  const outRel = toDocPath(rel);
  const outFile = path.join(outputBase, outRel);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, doc);
  console.log(`generated: ${outFile}`);
  generated.push({ outRel, sourceRel: rel });
}

// 一覧 README.md。docs/proto/README.md・docs/db/README.md と並ぶ index ファイル。
// 見出し・testing.md リンクは引数(input/output base)から導出し app 名を埋め込まない。
const appName = path.basename(inputBase); // apps/api → "api"
const readmeLines = [
  `# ${inputBase} テスト項目`,
  ``,
  `このディレクトリは \`${inputBase}\` 配下のテストファイル(\`*.test.ts(x)\` / \`*.ix_test.ts(x)\`)から \`make gen/doc/testing/${appName}\` で自動生成される。手動編集しない。テスト方針は [testing.md](../../rules/refs/${inputBase}/testing.md) 参照。`,
  ``,
  `## 読み方`,
  ``,
  `- \`#\` 見出しが describe(テスト対象の単位)、\`##\` 以降がネストした describe、箇条書き 1 行が 1 テスト項目(\`it\`)に対応する`,
  `- 1 行の日本語は、その項目の再現手順と期待する結果`,
  // エラー表記(Connect Code)は API 固有の概念なので api のみ。
  ...(appName === "api"
    ? [
        `- 末尾に \`(Unauthenticated)\` など括弧付き英字がある項目は、**そのエラーを返すこと**を期待している。括弧内の対応は [testing.md](../../rules/refs/apps/api/testing.md#it-タイトルでのエラー表記) を参照`,
      ]
    : []),
  ``,
  `## ファイル一覧`,
  ``,
];
for (const { outRel, sourceRel } of generated) {
  readmeLines.push(`- [${sourceRel}](./${outRel})`);
}
const readmePath = path.join(outputBase, "README.md");
await fs.writeFile(readmePath, readmeLines.join("\n") + "\n");
console.log(`generated: ${readmePath}`);

console.log(`\n${generated.length} doc(s) + README generated in ${outputBase}`);
