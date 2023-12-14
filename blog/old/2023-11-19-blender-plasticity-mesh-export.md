---
slug: 2023-11-19-blender-plasticity-mesh-export
title: Blender からメッシュを Plasticity (Indieプラン) にエクスポートする
published_at: "2023-11-19T08:24:54.354Z"
is_slide: false
summary: 
tags: [blender, plasticity, free_cad]
thumbnail_url: https://res.cloudinary.com/harumaxy/image/upload/v1700383970/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-11-19_17.52.03_bsxh5g.png
---

スカルプトしたモデルをリトポして Plasticity にエクスポートしてディテールを作るというワークフローがあるらしい。

Plasticity で編集するにはどんな種類のファイル形式でもいいわけではなくCADソフトで扱える形式のものでないと行けないらしい...  
(単に .obj とかをインポートしても、リファレンス扱いで編集できない)


Blender から直でエクスポートできる形式だと `.iges` がアドオンでできるらしい。

https://3dnchu.com/archives/export-iges-v1-4/

...が、Indieプランで Plasticity を購入していたため、 IGES 形式がインポートできなかった(Studioプランだと行けるけど)

IndieプランでインポートできるCAD形式は

- `.x_t` / `.x_b` (Parasolid)
- `.step`

Blender だと上記の形式をエクスポートできない(アドオンも見つからない)ので、間に FreeCAD を挟んで変換することにした。

> 追記:  
> 最初は .stl でメッシュをエクスポートして、FreeCADでNURBS化していたが、あまりきれいな形状にならないのでBlenderでエクスポートした .iges を使用するように変更


## Install FreeCAD

macOS だと Homebrew でインストールできる。

```sh
brew install freecad
```

## Export `.iges` from Blender to FreeCAD

[このプラグイン](https://3dnchu.com/archives/export-iges-v1-4/)でBlenderから `.iges` 形式でエクスポート

- FreeCad を開く
- `Create New`
- インポート (Cmd + I) > エクスポートした iges を開く



## Export .step from FreeCAD to Plasticity


メッシュをCADの形状に変換したものが作成されるので、その shape を選択して `.stp` 形式にエクスポートする。

Cmd + E

![alt](https://res.cloudinary.com/harumaxy/image/upload/v1700383843/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-11-19_17.47.51_vl5cur.png)


Plasticity を開き、 `F` から検索して `Import` する。


![alt](https://res.cloudinary.com/harumaxy/image/upload/v1700383970/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-11-19_17.52.03_bsxh5g.png)


これでOK!

## まとめ

- Blender はアドオンで `.iges` をCADデータをエクスポートできる
- Plasticity Indie プランだと `.iges` がインポートできない (Studioプランだとできる)
- FreeCAD を挟んで `.step` 形式にして Plasticity でインポートできた

まあ手間をかければ対応できるけど、めんどいだけなので...


Plasticity は Indie プランで機能制限しないでくれ〜

