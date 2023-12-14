---
slug: 2023-05-24-vscode-blender-python-setup
title: Blender Python を VSCode で書く
published_at: "2023-05-24T02:03:58.835Z"
is_slide: false
summary: summary
tags: [blender, vscode, python, poetry]
thumbnail_url: https://res.cloudinary.com/harumaxy/image/upload/v1684894083/blender_community_badge_white_cdzlfk.png
---

Poetry, Blender はインストール済みとする。

## Setup

Python のパッケージマネージャー [Poetry](https://python-poetry.org/) を使う

```shell
mkdir my-bpy && cd my-bpy
poetry init
poetry add fake-bpy-module-3.4
poetry add -D flake8 black mypy
poetry shell
# Open vscode
code .
```


### fake-bpy-module

ここはちょっとした落とし穴ポイント。

PyPi に [bpy](https://pypi.org/project/bpy/) パッケージがあるが、これをインストールしてもコードを書くときにIntellisenseが動作しない。

Python は元々静的型付けがない言語だったところに、後でtypingモジュールなどで型ヒントをつけるようになった。<br>
元の `bpy` には型定義がないので、型定義されたダミーの Python API コレクションである [fake-bpy-module](https://github.com/nutti/fake-bpy-module) をインストールする。

## Install easybpy (optional)

※入れるかはお好み。(Python のテキトーな型付けに則って作ってあるため `fake-bpy-module` と組み合わせるとlintエラーが出るため)

https://curtisholt.online/easybpy

Blender API をシンプルに扱うためのモジュール。<br>
単一のpythonファイルで配布されているため、[リポジトリ](https://github.com/curtisjamesholt/EasyBPY)から直接コピペしてローカルインポートすれば補完される。





easybpyを含むソースをBlenderで上で実行するには、以下のパスにもコピペしておく必要がある。<br>


```sh
# Windows
C:\Users\${USER}\AppData\Roaming\Blender Foundation\Blender\${VERSION}\scripts\modules

# MacOS
/Users/${USER}/Library/Application Support/Blender/${VERSION}/scripts/modules
```

![Mac easybpy path](https://res.cloudinary.com/harumaxy/image/upload/v1684897182/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-24_11.58.15_kuyego.png)


## Execute

![Blender scripting tab](https://res.cloudinary.com/harumaxy/image/upload/v1684899026/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-24_12.20.54_t1c02n.png)

Blender > Scripting のタブを開く

1. New Text で新しいpythonファイルを作成
2. VSCodeで編集 > コピペ
3. 再生ボタン(alt + P) で実行

フォルダマークからVSCodeで編集しているファイルを直接読むこともできる。<br>
編集後に自動で反映されないので、赤い?マークから `Reload from disk` を選択する必要がある。


## Logging

https://blender.stackexchange.com/questions/6173/where-does-console-output-go

Python 標準の `print` 関数は標準出力されるため、Blenderウィンドウ上で確認することはできない。

MacOS, Linux の場合はターミナルから Blender バイナリを実行することで、ターミナルに標準出力が表示される。<br>
Windosの場合は Window > Toggle System Console

または、Blender で開いてるエリアから Python Console を探してデータを出力するように print 関数を override する方法もある。

```py
import bpy

def print(data):
    for window in bpy.context.window_manager.windows:
        screen = window.screen
        for area in screen.areas:
            if area.type == "CONSOLE":
                override = {"window": window, "screen": screen, "area": area}
                bpy.ops.console.scrollback_append(
                    override, text=str(data), type="OUTPUT"
                )

actions = bpy.data.actions
print(actions)
```


## コメント

初見だと環境構築にかなり落とし穴あるような...<br>
型関連はPythonはやっぱクソ<br>
(とはいえ使う場面が多いのでガマン)