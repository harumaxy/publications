---
slug: 2023-05-25-export-unreal-assets-to-godot
title: Export UnrealEngine Animation assets to Godot
published_at: "2023-05-25T21:53:54.602Z"
is_slide: false
summary: summary
tags: [blender, godot, unrealengine, python, gltf]
thumbnail_url: https://res.cloudinary.com/harumaxy/image/upload/v1685062163/thumb-export-unreal-assets-to-todot_ppnixv.png
---

## Background

Godot is a free, open source, light weight, easy to use Game Engine. But it's very minor...

Both of Unity & Unreal Engine have asset stores, that has a large amount of 3d models, animations, sounds, etc.<br>
These assets can be used in other game engines or authoring tools. (except rare cases)

- Links
  - https://assetstore.info/notice/eulainterpretation20200413/
  - https://marketplacehelp.epicgames.com/s/article/Can-I-use-these-products-in-other-gaming-engines-like-Source-or-Unity?language=ja


Godot has poor asset store, so I want to use assets from other game engines.<br>
Let's go!

<img src="https://res.cloudinary.com/harumaxy/image/upload/v1685062163/thumb-export-unreal-assets-to-todot_ppnixv.png"
  width="50%" height="auto" alt="thumbnail" />


## Advanced Locomotion System V4

Now, I'm going to export This Unreal Engine asset.

https://www.unrealengine.com/marketplace/en-US/product/advanced-locomotion-system-v1

This asset is free, and contains a lot of high quality animations.<br>
I'll get `Animation Sequence` assets from this.


## Export .glb from Unreal Engine

GLTF is open starndard, and `.glb` is a single binary form of it.<br>
I prefer it rather than `.fbx`, because the later is closed and it's not natively supported in Godot.

UE5 can export assets as `.glb`.

### Export Mesh

Search `AnimMan` SkeltalMesh from Content Browser.<br>
Right click > Asset Action > Export.

Don't forget to choose `.glb` format.<br>
Export settings are default.


### Export Animations

By the default, bulk exporting assets is executable from UE Editor.

> 1. Content Browser > Filter > Animation > Animation Sequence
> 2. Select all assets
> 3. Right click > Asset Actions > Export Bulk

But **Export bulk** isn't compatible for glb export(now fbx only), so I have to write python to bulk export.

```python
# export AnimSequence as .glb
import unreal
rootPath = '/Game/AdvancedLocomotionV4'
outputDir = '/Users/{user_name}/Downloads/ExportALS/'  # This case is macOS

# remove preview mesh to reduce export size
exportOptions = unreal.GLTFExportOptions()
exportOptions.export_preview_mesh = False

selectedActors = set()

assetPaths = unreal.EditorAssetLibrary.list_assets(rootPath)
for assetPath in assetPaths:
    anim = unreal.EditorAssetLibrary.load_asset(assetPath)
    if unreal.MathLibrary.class_is_child_of(anim.get_class(), unreal.AnimSequence):
        # export format is automaticaly determined by extension
        exportPath = outputDir+anim.get_name()+'.glb'
        unreal.GLTFExporter.export_to_gltf(
            anim, exportPath, exportOptions, selectedActors)
```

... and paste this into UE Editor's python console.

![alt](https://res.cloudinary.com/harumaxy/image/upload/v1685054173/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_7.35.20_xxvimj.png)


1. Window > Output Log
2. Click console icon > choose `Python`
3. Paste and enter.

## Make animation library (Blender)

Now `.glb` files are exported!<br>
Godot can directly import them, Off course, but it's hard to use as it is.

- Many animation file exsists.
- Names are ugly.
- Contains unnecessary bones & animations.

So next, import them to Blender and edit them at once by python script.

![alt](https://res.cloudinary.com/harumaxy/image/upload/v1685066850/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_11.02.47_fhzoey.png)


1. import `AnimMan.glb`
2. rename armature to `Armature`
    - this naming is required for Godot to auto-convert to Skelton3D Node when importing
3. import all animation .glb files to blender
4. delete all the other skeltons except `Armature`
5. move to Scripting tab
6. paste scripts below and run


### rename_actions.py

```python
import bpy

actions = bpy.data.actions

loop_names = ["_run_", "_walk_", "_sprint_", "loop", "flail"]

# reanme actions
for action in actions:
    action.name = action.name.replace("ALS_", "").replace("_0_Mannequin_Skeleton", "")
    action.name = action.name.split(".")[0]
    lowername = action.name.lower()
    if any([n in lowername for n in loop_names]):
        action.name = action.name.split("-")[0] + "-loop"
```

If animation's name have `-loop` suffix, it's marked as loop animation when be imported to Godot.

[See here.](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_scenes.html#animation-loop-loop-cycle)


### set_fake_user.py

```python
import bpy

exclude_names = ["lean", "sweep", "accel", "additive", "secondarymotion", "_stop_"]

for action in bpy.data.actions:
    action.use_fake_user = True
    lower_name = action.name.lower()
    if any([n in lower_name for n in exclude_names]):
        action.use_fake_user = False
```

Blender's resource is deleted by closing app if isn't referenced by any objects.<br>
Set **fake user** for savivng action(animation) to `.blend` file.

[Some articles](https://note.com/bgeg/n/n7ff636b77f66) says "push actions to NLA editor", but it's not necessary.(maybe)<br>

AdvancedLocomotionSystemV4(ALS) contains some animations which don't work outside UE, so remove them.

### remove_unnecessary_bones.py

```python
import bpy

exclude_names = ["ik_", "VB"]


bpy.ops.object.mode_set(mode="EDIT")


armature = bpy.data.objects.get("Armature")  # type: ignore

for bone in armature.data.edit_bones:
    if any([n in bone.name for n in exclude_names]):
        armature.data.edit_bones.remove(bone)

for action in bpy.data.actions:
    for fcurve in action.fcurves:
        if any([n in fcurve.data_path for n in exclude_names]):
            action.fcurves.remove(fcurve)

bpy.ops.object.mode_set(mode="OBJECT")
```

ALS's skelton has some `ik_`, `VB` prefixed bones.

These are useful to authoring animation, but not necessary for game engine.<br>
So remove them.


Now ready to use!

## Import to Godot

You can import `.glb` exported from Blender<br>
or directly import `.blend` if you set Godot's `EditorSettings > FileSystem > Import > Blender 3 Path`.

As I tried, `.glb` is better than `.blend` because the later takes a lot of time when importing.

### Animation Retargeting

Godot has a animation retargeting feature.<br>
I modify import setting to use this.

![re-import](https://res.cloudinary.com/harumaxy/image/upload/v1685065708/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_10.40.52_v47qxb.png)


1. double click `.glb` you imported
2. select `Skelton3D` from SceneTree.
3. Retarget > Bone Map > New Bone Map > Profile > New SkeltonProfileHumanoid
4. Rest Fixer > Fix Shilhouette > Enable = true

That's all!

ALS's skelton are like a human shape, so it will be recognized to humanoid without any modification.


## Using as AnimationLibrary

1. New inherited scene, or add to scene & check `editable children`
2. select `AnimationPlayer`
3. Animation > Manage Animations...
   - ![manage animations](https://res.cloudinary.com/harumaxy/image/upload/v1685065712/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_10.46.21_byf3ry.png)
4. click floppy icon > Make Unique > Save as `ALSMotionLibrary.tres`
    - ![save as unique](https://res.cloudinary.com/harumaxy/image/upload/v1685065716/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_10.46.47_sepmnt.png)
5. load from another AnimationPlayer


## Closing

![retarget to other skelton](https://res.cloudinary.com/harumaxy/image/upload/v1685065721/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2023-05-26_10.45.28_tyj6ak.png)


I've thought that it's hard to use assets distributed for UnrealEngine/Unity in Godot, but meshes or animations are just a resource and expoting them can be automated in part by scripting.

This time I tried exporting from UE to Godot, and some techniques are useful for other engines too.

### Issue

Some engine-specific assets (like Blueprint, C# code, etc) are hard to export.<br>
Other exporting methods are required (manual port, develop transpiler?), but it's too hard to do soon.  

I'll try them someday.