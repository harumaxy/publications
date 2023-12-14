---
slug: 2023-05-23-godot-import-blend-file
title: Blenderファイル(.blend)をGodotで読み込む
published_at: "2023-05-23T07:47:22.236Z"
is_slide: false
summary: summary
tags: [blender, godot]
thumbnail_url: https://res.cloudinary.com/harumaxy/image/upload/v1684831590/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-23_17.24.19_h4hv5e.png
---

# 概要

- Godot で .blend ファイルを直接読み込める
  - 実際はGodotから、Blender組み込みのGLTFエクスポーターを呼び出している。
  - そのために、Blenderのバイナリのパスを Editor Settings に設定する必要がある

ゲーム制作では、3Dモデルをイジる > ゲームエンジンにエクスポートして見た目を確認 > またイジる ... のサイクルが発生する。<br>
`.blend` ファイルが直接読み込めるとエクスポート操作が自動化されて楽。

## Check Blender binary path

Mac でやる。

Blender.app の場所からさらに中に入って、 `Blender.app/Contents/MacOS/Blender` が Blender のバイナリ。

自分の環境ではHomebrew経由でインストールしたので、以下のパスでした。

```sh
/System/Volumes/Data/Applications/Blender.app/Contents/MacOS/Blender
```

## Set Godot > Editor Settings > Blender 3 Path

`Cmd + ,` (もしくはメニュー > `Editor > Editor Settings`) で開き、 `Blender 3 Path` と検索して上記のパスをセットする。<br>
`FilesSystem > Import > Blender 3 Path`


![alt](https://res.cloudinary.com/harumaxy/image/upload/v1684831590/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-23_17.24.19_h4hv5e.png)


セットしたら念のためプロジェクトを再起動 (`Project > Reload Current Project`)

Godot のファイルブラウザーに `.blend` をドラッグアンドドロップして、表示されるようになれば成功(Finderでファイルを移動してもいい)　

## Import Settings

Godot 上で `.blend` ファイルをダブルクリックするとインポート設定を開ける。<br>
Rootの`Scene`を選択すると、BlenderのGLTFエクスポーターと同じ設定項目がある。

![alt](https://res.cloudinary.com/harumaxy/image/upload/v1684846060/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-23_21.45.47_thyn5w.png)


Blender で GLTF をエクスポートするワークフローの場合と同じように設定すればいい(大体はデフォルトでいいはず...)

今回は、 `Blender > Visible` を `Visible Only` に設定した。<br>
これをすると Blender 側で非表示にしているオブジェクトはインポートされない。

いらないリグとか、モデリング用のReferenceとかライトとかを非表示にしとけば、不要なアセットがインポートされずに済む

## 結果

![](https://res.cloudinary.com/harumaxy/image/upload/v1684846423/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-23_21.52.26_thndhh.png)


きっちりインポートできた

Blender側で変更をすると、Godot側で設定したインポート設定に沿って再インポートされる。