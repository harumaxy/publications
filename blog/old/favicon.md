---
title: favicon を git lfs で管理したら、Deno Deploy でうまく配信されなかった話
published_at: "2023-04-11T17:17:01+09:00"
summary: Git LFS
tags: ["blog", "favicon"]
---

このサイトは [Deno Deploy](https://deno.com/deploy) でSSRしてるわけだけど、 git lfs で追加した favicon がうまく配信されてなかったらしい。
<https://harumaxy.com/favicon.ico>

Deno DeployがGitソースをpullするときにLFSオブジェクトはpullされない説。<br/>
ということでそのまま `favicon.ico` をgitにcommitしたけど、約34KBあるが大丈夫だろうか...<br/>
まあfreshプロジェクトを作成した時点で、デフォルトのレモンのfaviconも22KBくらいあったから大丈夫ということにしよう。
