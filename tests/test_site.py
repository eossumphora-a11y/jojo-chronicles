"""Headless smoke test; requires pip install playwright and installed Chromium."""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE=os.environ.get('JOJO_TEST_URL','http://127.0.0.1:8765')
ROOT=Path(__file__).resolve().parents[1]

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=await browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True,permissions=['clipboard-read','clipboard-write'])
    page=await context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    await page.goto(BASE+'/studio/',wait_until='networkidle')
    assert await page.locator('#storage-status').inner_text()=='● Salvataggio locale attivo'
    await page.click('#quick-entry')
    await page.fill('#entry-title','Biancaneve [ESEMPIO DI TEST]')
    await page.fill('#entry-summary','Conosciuta dal gruppo.')
    await page.fill('#entry-body','Una figura vista nel castello.')
    await page.fill('#entry-notes','SEGRETO-FAKE-BIANCA')
    await page.check('#entry-public')
    await page.click('#entry-form button[type=submit]')
    await page.wait_for_timeout(200)
    await page.click('#quick-entry')
    await page.fill('#entry-title','Il Re [ESEMPIO NASCOSTO]')
    await page.fill('#entry-notes','SUPERSECRETO')
    await page.click('#entry-form button[type=submit]')
    await page.click('#quick-session')
    await page.fill('#session-title','Il primo incontro [ESEMPIO]')
    await page.fill('#session-number','3')
    await page.fill('#session-date','2026-10-20')
    await page.fill('#session-summary','Il gruppo attraversa il corridoio.')
    await page.fill('#session-events','12:30 | Il gruppo entra nel corridoio.\n14:09 | Scoprono una porta.')
    await page.fill('#session-quotes','Narratore | 14:09 | La porta è chiusa.')
    await page.fill('#session-transcript','TEST AUDIO SEGRETO NON PUBBLICARE')
    await page.fill('#session-notes','IL CATTIVO E IL NARRATORE')
    await page.check('#session-public')
    await page.click('#session-form button[type=submit]')
    await page.wait_for_timeout(200)
    assert await page.locator('#stat-entries').inner_text()=='2'
    assert await page.locator('#stat-sessions').inner_text()=='1'
    await page.reload(wait_until='networkidle')
    assert await page.locator('#stat-entries').inner_text()=='2', 'indexedDB persistence broken'
    await page.click('[data-view=publish]')
    async with page.expect_download() as dl:
      await page.click('#download-public')
    public_dl=await dl.value
    assert public_dl.suggested_filename=='public.json'
    path=await public_dl.path()
    public=json.loads(Path(path).read_text())
    assert len(public['entries'])==1 and len(public['sessions'])==1
    pub_s=json.dumps(public,ensure_ascii=False)
    for forbidden in ['SEGRETO-FAKE-BIANCA','SUPERSECRETO','TEST AUDIO SEGRETO NON PUBBLICARE','IL CATTIVO E IL NARRATORE','Il Re [ESEMPIO NASCOSTO]','transcript','notes']:
      assert forbidden not in pub_s, f'Leak! {forbidden}'
    assert public['sessions'][0]['quotes'][0]['text']=='La porta è chiusa.'
    assert public['sessions'][0]['events'][0]['time']=='12:30'
    async with page.expect_download() as dl2:
      await page.click('#download-backup')
    backup=json.loads(Path(await (await dl2.value).path()).read_text())
    assert len(backup['archive']['entries'])==2
    assert 'TEST AUDIO SEGRETO NON PUBBLICARE' in json.dumps(backup)
    # public page with intercepted published sample response: no writes into package
    other=await context.new_page()
    other.on('pageerror',lambda error:errors.append(str(error)))
    await other.route('**/docs/data/public.json',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(public)))
    await other.goto(BASE+'/docs/',wait_until='networkidle')
    assert await other.locator('#count-entries').inner_text()=='1'
    assert await other.locator('#count-sessions').inner_text()=='1'
    assert await other.get_by_text('Biancaneve [ESEMPIO DI TEST]').count()==1
    await other.get_by_text('Biancaneve [ESEMPIO DI TEST]').click()
    assert await other.locator('#detail-title').inner_text()=='Biancaneve [ESEMPIO DI TEST]'
    await other.click('#detail-close')
    await other.locator('.session').first.click()
    assert await other.locator('.quote').count()==1
    await other.click('#detail-close')
    assert not errors,errors
    await page.screenshot(path=str(ROOT/'tests/master-preview.png'),full_page=True)
    await other.screenshot(path=str(ROOT/'tests/public-preview.png'),full_page=True)
    print('PASS: IndexedDB persistence, editing, public export privacy, private backup, reader, session chronology, zero JS errors.')
    await browser.close()

if __name__=='__main__':
  asyncio.run(main())
