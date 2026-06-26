# note AIカンパニー（Claude Code フルオート版）

ChatGPTで5人のAI社員を手動コピペしていた流れを、Claude Codeのサブエージェントで
「1コマンド→記事一式が完成」する形に作り直したものです。

## 何が変わったか
- 手動コピペが消える。社長役のコマンド1本が5人を順番に呼ぶ。
- 各社員は出力をファイルに保存し、次の社員がそのファイルを読む（コンテキストではなくファイルで受け渡し）。
  - サブエージェントが親に返すのは要約だけという仕様の制約を回避できる。
  - 長文でも「途中で止まる→続きを書いて」が起きない。
- ライターと編集長に脱AIスキル（datsu-ai-skill）を読み込ませ、AI臭チェックを自動化。

## ファイル構成
```
.claude/
  commands/
    note-create.md        ← 社長（オーケストレーター）
  agents/
    note-researcher.md    ← AI社員1 リサーチ
    note-planner.md       ← AI社員2 企画
    note-writer.md        ← AI社員3 ライター（脱AIスキル使用）
    note-editor.md        ← AI社員4 編集長（脱AIスキル使用）
    note-marketer.md      ← AI社員5 集客
```

## セットアップ（Windows）
1. note記事を作りたいプロジェクト用フォルダを1つ作る（例 `C:\note-ai`）。
2. このパッケージの `.claude` フォルダを、そのプロジェクト直下にまるごと置く。
3. 脱AIスキル `datsu-ai-skill` を使えるようにしておく
   （`~/.claude/skills/datsu-ai-skill/SKILL.md` か、プロジェクトの `.claude/skills/` に配置）。
   ※ サブエージェントは親のスキルを継承しないので、writer/editor の frontmatter で明示的に読み込んでいます。
4. そのフォルダで `claude` を起動する。
   ファイルを後から編集した場合はセッションを再起動すると反映される。

## 使い方
Claude Code のセッション内で、ジャンルを付けて1行打つだけ。
```
/note-create 40代女性のダイエット
```
完了すると `_work/<スラッグ>/` 配下に5ファイルができる。
```
_work/diet40/
  01_research.md   市場リサーチ
  02_plan.md       企画書
  03_draft.md      記事ドラフト
  04_final.md      ★完成原稿（noteに貼る）
  04_report.md     編集レポート
  05_sns.md        SNS投稿7本
```

## コスト調整のヒント
- サブエージェントはトークンを多く使う（各自が別コンテキストを持つため）。
- 質が要る writer / editor を opus、調査・集客の researcher / marketer を sonnet にしている。
  さらに節約したい工程は frontmatter の `model:` を haiku に下げてよい。

## 参考
- Claude Code サブエージェント公式: https://code.claude.com/docs/en/sub-agents
- スキルの明示プリロードについて: https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/
