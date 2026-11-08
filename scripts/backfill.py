import json,time,urllib.request,datetime,pathlib,py7zr
root=pathlib.Path('.price-cache');groups={622770:23821,668497:24541,630687:24325,630688:24326,654135:24448,644282:24380,648415:24380,672404:24587,672394:24587}
output=pathlib.Path('public/data/history.json');data=json.loads(output.read_text());history={x['date']:x for x in data['history']}
start=datetime.date(2026,8,19);end=datetime.date(2026,11,1)
dates={start+datetime.timedelta(days=n) for n in range(0,(end-start).days+1,7)}
dates.update(end-datetime.timedelta(days=n) for n in range(1,8))
for day in sorted(dates):
 d=day.isoformat()
 if d in history:continue
 archive=root/(d+'.7z');url=f'https://tcgcsv.com/archive/tcgplayer/prices-{d}.ppmd.7z'
 try:
  if not archive.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'RC-Tracker/1.0'})
   with urllib.request.urlopen(req,timeout=60) as response:archive.write_bytes(response.read())
  paths=[f'{d}/3/{g}/prices' for g in set(groups.values())]
  with py7zr.SevenZipFile(archive) as a:a.extract(path=root/'extracted',targets=paths)
  prices={}
  for pid,g in groups.items():
   rows=json.loads((root/'extracted'/f'{d}/3/{g}/prices').read_text())['results']
   row=next(x for x in rows if x['productId']==pid and x['subTypeName']=='Normal')
   assert row['marketPrice'] is not None and row['marketPrice']>0
   prices[str(pid)]=row['marketPrice']
  history[d]={'date':d,'prices':prices,'sourceUrl':url,'historical':True}
  data['history']=sorted(history.values(),key=lambda x:x['date']);data['openedOn']='2026-08-19'
  output.write_text(json.dumps(data,indent=2)+'\n');print('Saved',d,flush=True)
 except Exception as e:print('Unavailable',d,str(e),flush=True)
 time.sleep(.25)
