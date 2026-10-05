from pathlib import Path
import re

p=Path("index.html")
s=p.read_text()
pattern=r'<style id="cj-bottom-nav-visibility-v1">.*?</style>'
m=re.search(pattern,s,re.S)
if not m:
    raise SystemExit("bottom-nav override block not found")
b=m.group(0)

old_nav='''#cjScreenshotHome .cjx-bottom{
  height:78px!important;
  padding:0!important;
  box-sizing:border-box!important;
  align-items:start!important;
}'''
new_nav='''#cjScreenshotHome .cjx-bottom{
  height:78px!important;
  padding:0!important;
  box-sizing:border-box!important;
  align-items:start!important;
  border-top:0!important;
  position:fixed!important;
}
#cjScreenshotHome .cjx-bottom::before{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:54px;
  height:1px;
  background:#dfe5ec;
  pointer-events:none;
}'''

if old_nav not in b:
    raise SystemExit("expected nav block not found")

b=b.replace(old_nav,new_nav,1)
b=b.replace('bottom:calc(env(safe-area-inset-bottom) + 88px)!important;',
            'bottom:calc(env(safe-area-inset-bottom) + 94px)!important;',1)

ns=s[:m.start()]+b+s[m.end():]
p.write_text(ns)

checks={
  "icons_unchanged_height54": "height:54px!important" in b and "min-height:54px!important" in b,
  "icons_unchanged_home_explore27": "width:27px!important" in b and "height:27px!important" in b,
  "journeys_unchanged33": "width:33px!important" in b and "height:33px!important" in b,
  "line_moved_down": "top:54px;" in b and "border-top:0!important" in b,
  "line_color_preserved": "background:#dfe5ec;" in b,
  "ai_above_line_nudged": "+ 94px" in b,
  "mic_size_unchanged": "width:29px!important" in b and "height:29px!important" in b,
}
for k,v in checks.items():
    print(k, "PASS" if v else "FAIL")
if not all(checks.values()):
    raise SystemExit("verification failed")
print("PATCH_OK")
