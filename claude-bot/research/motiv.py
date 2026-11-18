import json,glob,collections,math,datetime as dt
R='/root/.claude/projects/-home-claude/cbaa4e17-4805-505b-a025-8a132c98d375/tool-results/'
rows=[]
for f in ['mcp-Google_Sheets-get_values-1795039172382-2og7cs.txt','mcp-Google_Sheets-get_values-1795039184381-5alfpk.txt','mcp-Google_Sheets-get_values-1795043279617-7fuoe6.txt','mcp-Google_Sheets-get_values-1795043281487-brhkvn.txt','mcp-Google_Sheets-get_values-1795043283510-8bnmma.txt','mcp-Google_Sheets-get_values-1795043285624-c8rhcg.txt']:
    d=json.load(open(R+f)); rows+= d.get('values') or d['content']['values']
G={}
for r in rows:
    if len(r)<9 or not r[4].startswith('KXNBAGAME-'): continue
    t=r[4].split('-'); ev=t[1]; team=t[2]
    try: p=float(r[6])/100; won=int(r[8]); tip=dt.datetime.strptime(r[1],'%Y-%m-%d %H:%M')
    except: continue
    if not(0.03<p<0.97): continue
    g=G.setdefault(ev,{'tip':tip,'c':{}}); g['c'][team]=(p,won)
games=[]
for ev,g in G.items():
    if len(g['c'])!=2: continue
    codes=ev[7:]; away,home=codes[:3],codes[3:]
    if away not in g['c'] or home not in g['c']: continue
    if sum(w for _,w in g['c'].values())!=1: continue
    if g['tip']<dt.datetime(2025,10,21): continue          # regular seasons only (skip 2025 playoffs + preseason)
    games.append((g['tip'],away,home,g['c']))
games.sort()
print('games',len(games),games[0][0].date(),'to',games[-1][0].date())
last={};streak=collections.defaultdict(int);meet={};rec=collections.defaultdict(lambda:[0,0]);season={}
obs=[]
for tip,away,home,c in games:
    se=tip.year if tip.month>=9 else tip.year-1
    for T in (away,home):
        if season.get(T)!=se: season[T]=se; streak[T]=0; last.pop(T,None); rec[T]=[0,0]
    for T,O in ((away,home),(home,away)):
        p,won=c[T]
        rest=(tip.date()-last[T].date()).days if T in last else 9
        orest=(tip.date()-last[O].date()).days if O in last else 9
        lm=meet.get((T,O)); rev=1 if (lm and lm[1]==se and lm[0]==0) else 0
        L=-streak[T] if streak[T]<0 else 0; W=streak[T] if streak[T]>0 else 0
        gp=sum(rec[T]); wp=rec[T][0]/gp if gp>=8 else None
        sc=(3 if L>=5 else 2 if L>=3 else 1 if L>=2 else 0)+(3 if (rest>=2 and orest==1) else 0 if rest==1 and orest>=2 else 1)+2*rev+(2 if T==home else 0)
        obs.append(dict(tip=tip,T=T,p=p,won=won,L=L,W=W,rest=rest,orest=orest,rev=rev,home=T==home,sc=sc,wp=wp,ev=(tip,away,home)))
    w=away if c[away][1] else home; l=home if w==away else away
    streak[w]=streak[w]+1 if streak[w]>0 else 1; streak[l]=streak[l]-1 if streak[l]<0 else -1
    rec[w][0]+=1; rec[l][1]+=1
    meet[(w,l)]=(1,se); meet[(l,w)]=(0,se); last[away]=tip; last[home]=tip
# pair up score diffs
by=collections.defaultdict(list)
for o in obs: by[o['ev']].append(o)
for a,b in by.values(): a['d']=a['sc']-b['sc']; b['d']=b['sc']-a['sc']
split=games[int(len(games)*0.6)][0]
def stat(sel,name):
    out=[]
    for lab,S in (('ALL',sel),('first 60%',[o for o in sel if o['tip']<split]),('last 40%',[o for o in sel if o['tip']>=split])):
        n=len(S)
        if n<15: out.append('%s n=%d'%(lab,n)); continue
        w=sum(o['won'] for o in S); ep=sum(o['p'] for o in S); var=sum(o['p']*(1-o['p']) for o in S)
        roi=sum(o['won']/o['p']-1-0.07*(1-o['p']) for o in S)/n
        out.append('%s n=%d won %.1f%% vs price %.1f%% z=%+.2f ROI %+.1f%%'%(lab,n,100*w/n,100*ep/n,(w-ep)/math.sqrt(var),100*roi))
    print('%-34s | '%name+' | '.join(out))
T=[('Losing streak 2+',lambda o:o['L']>=2),('Losing streak 3+ ("needs it")',lambda o:o['L']>=3),('Losing streak 5+',lambda o:o['L']>=5),
 ('Lost 3+ AND underdog (<45c)',lambda o:o['L']>=3 and o['p']<.45),('Lost 3+ AND at home',lambda o:o['L']>=3 and o['home']),
 ('Win streak 3+',lambda o:o['W']>=3),('Win streak 5+',lambda o:o['W']>=5),
 ('On back-to-back (played yesterday)',lambda o:o['rest']==1),('B2B vs rested opponent',lambda o:o['rest']==1 and o['orest']>=2),
 ('Rested vs opponent on B2B',lambda o:o['rest']>=2 and o['orest']==1),('Favorite on B2B vs rested dog',lambda o:o['rest']==1 and o['orest']>=2 and o['p']>=.6),
 ('Rested dog vs favorite on B2B',lambda o:o['rest']>=2 and o['orest']==1 and o['p']<=.4),
 ('Revenge (lost last meeting)',lambda o:o['rev']),('Revenge AND at home',lambda o:o['rev'] and o['home']),
 ('Home team',lambda o:o['home']),('Home underdog (<45c)',lambda o:o['home'] and o['p']<.45),
 ('Bad team (<35% wins) lost 3+',lambda o:o['wp'] is not None and o['wp']<.35 and o['L']>=3),
 ('Good team (>60% wins) lost 2+',lambda o:o['wp'] is not None and o['wp']>.6 and o['L']>=2),
 ('Score 0-2 (low motivation)',lambda o:o['sc']<=2),('Score 3-4',lambda o:3<=o['sc']<=4),('Score 5-6',lambda o:5<=o['sc']<=6),('Score 7+ (high motivation)',lambda o:o['sc']>=7),
 ('Score edge +3 or more vs opp',lambda o:o['d']>=3),('Score edge +5 or more vs opp',lambda o:o['d']>=5),('Score edge -3 or worse',lambda o:o['d']<=-3)]
for n,f in T: stat([o for o in obs if f(o)],n)
print('tests',len(T),'obs',len(obs))
print('--- FADE: bet AGAINST the "needs it" team ---')
for o in obs:
    a,b=by[o['ev']]; o['oL']=(b if o is a else a)['L']; o['oh']=(b if o is a else a)['home']
for n,f in [('Opponent lost 3+',lambda o:o['oL']>=3),('Opponent lost 3+, we are favorite 55c+',lambda o:o['oL']>=3 and o['p']>=.55),('Opponent lost 3+ and is at home',lambda o:o['oL']>=3 and o['oh']),('Opponent lost 5+',lambda o:o['oL']>=5),('Opponent lost 3+, we did not (L<2)',lambda o:o['oL']>=3 and o['L']<2)]: stat([o for o in obs if f(o)],n)
