from pathlib import Path

p=Path("index.html")
s=p.read_text()
marker="cj-bottom-nav-visibility-v1"
if marker in s:
    raise SystemExit("override already exists")
css="""<style id="cj-bottom-nav-visibility-v1">
#cjScreenshotHome .cjx-ai-dock{
  bottom:calc(env(safe-area-inset-bottom) + 66px)!important;
}
#cjScreenshotHome .cjx-bottom{
  padding-top:8px!important;
  padding-bottom:8px!important;
  align-items:center!important;
}
#cjScreenshotHome .cjx-bottom button{
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  min-height:58px!important;
  color:#198df3!important;
}
#cjScreenshotHome .cjx-bottom button svg{
  width:25px!important;
  height:25px!important;
  color:#198df3!important;
  stroke:#198df3!important;
}
#cjScreenshotHome .cjx-bottom .dots-icon,
#cjScreenshotHome .cjx-bottom .cjx-brand-nav-icon{
  color:#198df3!important;
}
#cjScreenshotHome .cjx-bottom .cjx-brand-nav-icon svg{
  width:31px!important;
  height:31px!important;
  color:#198df3!important;
  fill:#198df3!important;
  stroke:none!important;
}
#cjScreenshotHome .cjx-bottom button span{
  color:#198df3!important;
}
#cjScreenshotHome .cjx-mic{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
}
#cjScreenshotHome .cjx-mic svg{
  width:27px!important;
  height:27px!important;
  display:block!important;
  margin:0!important;
  transform:none!important;
}
</style>"""
if "</body>" not in s:
    raise SystemExit("missing body close")
s=s.replace("</body>",css+"\n</body>",1)
p.write_text(s)
print("PATCH_OK")
