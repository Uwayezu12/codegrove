import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {topics,lessons,courses,problems,questions} from '../../frontend/app/data';
const lesson=lessons.find(l=>l.id==='arrays')!;
const course=courses.find(c=>c.id==='dsa-foundations')!;
const problem=problems.find(p=>p.id==='array-sum')!;
async function goto(page:Page,path:string){await page.goto(path);await expect(page.locator('h1').first()).toBeVisible();}
async function login(page:Page,email:string,password:string){await goto(page,'/signin');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/);await expect(page.getByRole('tab',{name:'My courses'})).toBeVisible();}
async function logout(page:Page){await goto(page,'/dashboard');await page.getByRole('link',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/$/);}
async function answerQuiz(page:Page){for(let i=0;i<questions.length;i++)await page.locator(`#q${i}-${questions[i].answer}`).check();}

test('complete V1 journey with logout/login persistence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const email=`browser-${randomUUID()}@example.test`,password=randomUUID()+randomUUID();
 await goto(page,'/');
 await page.getByRole('link',{name:'All tutorials',exact:true}).click();await expect(page).toHaveURL(/\/tutorials$/);
 await page.locator('.lesson-list a').filter({hasText:lesson.title}).click();await expect(page.getByRole('heading',{name:lesson.title,exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Search',exact:true}).click();await page.getByRole('textbox',{name:'Search learning content'}).fill('arrays');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page).toHaveURL(/q=arrays/);await expect(page.locator('.lesson-list')).toContainText(lesson.title);
 await page.getByRole('link',{name:'Sign in',exact:true}).click();await page.getByRole('link',{name:'New to CodeGrove? Create an account'}).click();
 await page.getByLabel('Your name').fill('Browser acceptance learner');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page).toHaveURL(/\/search\?q=arrays$/);
 await logout(page);await login(page,email,password);
 await goto(page,'/courses');await page.locator(`a[href="/courses/${course.id}"]`).first().click();await page.getByRole('button',{name:'Enroll for free'}).click();await expect(page.getByRole('button',{name:'Enrolled',exact:true})).toBeDisabled();
 await page.locator('.lesson-list a').filter({hasText:lesson.title}).click();await page.getByRole('button',{name:'Mark as completed',exact:true}).click();await expect(page.getByRole('button',{name:'Completed — mark unread',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Save lesson',exact:true}).click();await expect(page.getByRole('button',{name:'Saved',exact:true})).toBeEnabled();
 await goto(page,'/practice');await page.getByRole('combobox',{name:'Filter difficulty'}).click();await page.getByRole('option',{name:'Medium',exact:true}).click();await expect(page.locator('.problem-list')).not.toContainText(problem.title);
 await page.getByRole('combobox',{name:'Filter difficulty'}).click();await page.getByRole('option',{name:'All difficulties',exact:true}).click();await page.getByRole('textbox',{name:'Search problems'}).fill('no-match-here');await expect(page.getByText('No matching problems. Try another search or difficulty.')).toBeVisible();await page.getByRole('textbox',{name:'Search problems'}).fill(problem.title);
 await page.locator(`.problem-list a[href="/practice/${problem.id}"]`).click();await page.getByRole('tab',{name:'Hint',exact:true}).click();await expect(page.getByText(problem.hint,{exact:true})).toBeVisible();await page.getByRole('tab',{name:'Solution',exact:true}).click();await expect(page.locator('.code-block pre')).toContainText('solve');await page.getByRole('tab',{name:'Problem',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'JavaScript solution'});await editor.fill(problem.solution);await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.getByText('1 / 1 tests passed',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByText(`${problem.tests.length} / ${problem.tests.length} tests passed`,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
 await goto(page,'/compiler');await page.getByRole('textbox',{name:'Playground JavaScript code'}).fill('console.log("acceptance output")');await page.getByRole('button',{name:'Run code',exact:true}).click();await expect(page.locator('.test-results pre')).toHaveText('acceptance output');await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.getByRole('textbox',{name:'Playground JavaScript code'})).toHaveValue(/const name/);
 await goto(page,'/interview');const question=page.getByRole('button',{name:'How do you approach an unfamiliar coding problem?'});await question.click();await expect(question).toHaveAttribute('aria-expanded','true');await question.click();await expect(question).toHaveAttribute('aria-expanded','false');await page.getByRole('link',{name:'Check your fundamentals',exact:true}).click();
 await expect(page.getByRole('button',{name:'Submit quiz'})).toBeDisabled();await answerQuiz(page);await page.getByRole('button',{name:'Submit quiz'}).click();await expect(page.getByText('Result saved to your dashboard.',{exact:true})).toBeVisible();await expect(page.locator('.answer-explanation')).toHaveCount(8);
 await goto(page,'/dashboard');await expect(page.locator('.stats-grid .stat')).toHaveText(['1','1','1','100']);await expect(page.locator('.enrolled-list')).toContainText(course.title);
 for(const tab of ['Saved lessons','Completed']){await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText(lesson.title);}
 await page.getByRole('tab',{name:'Solved problems'}).click();await expect(page.getByRole('tabpanel')).toContainText(problem.title);
 await logout(page);await login(page,email,password);await expect(page.locator('.stats-grid .stat')).toHaveText(['1','1','1','100']);await page.getByRole('tab',{name:'Saved lessons'}).click();await expect(page.getByRole('tabpanel')).toContainText(lesson.title);
 const progress=await page.request.get('/api/progress');expect(progress.status()).toBe(200);expect((await progress.json()).records).toEqual(expect.arrayContaining([{kind:'bookmark',item:lesson.id,value:1},{kind:'complete',item:lesson.id,value:1},{kind:'enroll',item:course.id,value:1},{kind:'solved',item:problem.id,value:1},{kind:'quiz',item:'fundamentals',value:100}].map(r=>expect.objectContaining(r))));
 expect(errors).toEqual([]);
});

test('all visible navigation targets, theme, responsive menu, empty search and not found',async({page,isMobile})=>{
 test.setTimeout(180000);
 await goto(page,'/');await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);await page.getByRole('button',{name:'Switch to light mode'}).click();
 if(isMobile){const menu=page.getByRole('button',{name:'Toggle navigation'});await expect(page.getByRole('navigation',{name:'Main navigation'})).not.toBeVisible();await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Courses',exact:true}).click();await expect(page).toHaveURL(/\/courses$/);}
 const routes=['/','/tutorials','/courses','/practice','/interview','/dashboard','/search','/quiz','/compiler',...topics.map(x=>'/tutorials/'+x.id),...lessons.map(x=>'/tutorial/'+x.id),...courses.map(x=>'/courses/'+x.id),...problems.map(x=>'/practice/'+x.id)];
 // Rendering all routes and checking actual href responses complements clicking journey controls.
 for(const route of routes){await goto(page,route);await expect(page.getByRole('heading',{name:'Page not found'})).toHaveCount(0);const hrefs=await page.locator('a:visible').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));for(const href of hrefs){expect(href).toBeTruthy();expect(href).not.toBe('#');expect(href).not.toMatch(/^javascript:/);if(href?.startsWith('#'))await expect(page.locator(href)).toHaveCount(1);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`horizontal overflow at ${route}`).toBe(true);
 }
 await goto(page,'/search?q=definitely-no-content');await expect(page.getByRole('status').filter({hasText:'0 results'})).toBeVisible();
 for(const route of ['/unknown','/tutorials/missing','/tutorial/missing','/courses/missing','/practice/missing','/compiler/extra']){await goto(page,route);await expect(page.getByRole('heading',{name:'Page not found'})).toBeVisible();await page.getByRole('link',{name:'Back to home'}).click();await expect(page).toHaveURL(/\/$/);}
});

test('clipboard failure, execution errors, timeout and disabled editor controls',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));
 await goto(page,'/tutorial/arrays');await page.getByRole('button',{name:'Copy',exact:true}).click();await expect(page.getByText('Could not copy automatically. Select the code and copy it manually.')).toBeVisible();
 await goto(page,'/practice/array-sum');const editor=page.getByRole('textbox',{name:'JavaScript solution'});await editor.fill('function solve(){ throw new Error("intentional failure"); }');await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.locator('.test-results')).toContainText('intentional failure');
 await editor.fill('function solve(){ while(true){} }');await page.getByRole('button',{name:'Run',exact:true}).click();await expect(editor).toBeDisabled();await expect(page.getByRole('button',{name:'Reset code'})).toBeDisabled();await expect(page.locator('.test-results')).toContainText('Execution stopped after 3 seconds');await expect(editor).toBeEnabled();await page.getByRole('button',{name:'Reset code'}).click();await expect(editor).toHaveValue(problem.starter);
 await goto(page,'/compiler');const playground=page.getByRole('textbox',{name:'Playground JavaScript code'});await playground.fill('while(true){}');await page.getByRole('button',{name:'Run code',exact:true}).click();await expect(playground).toBeDisabled();await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeDisabled();await expect(page.locator('.test-results')).toContainText('Execution stopped after 3 seconds');await expect(playground).toBeEnabled();
});

test('failed quiz save and progress load can be retried without losing answers',async({page})=>{
 const email=`retry-${randomUUID()}@example.test`,password=randomUUID()+randomUUID();
 await goto(page,'/register');await page.getByLabel('Your name').fill('Retry acceptance');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/);
 let failLoad=true;await page.route('**/api/progress',async route=>{if(failLoad&&route.request().method()==='GET'){failLoad=false;await route.fulfill({status:503,json:{error:'Test profile outage'}});}else await route.continue();});
 await page.reload();await expect(page.getByRole('alert')).toContainText('Test profile outage');await page.getByRole('button',{name:'Retry loading'}).click();await expect(page.getByRole('tab',{name:'My courses'})).toBeVisible();await page.unroute('**/api/progress');
 await goto(page,'/quiz');await answerQuiz(page);let failSave=true;
 await page.route('**/api/progress',async route=>{if(failSave&&route.request().method()==='POST'){failSave=false;await route.fulfill({status:503,json:{error:'Test save outage'}});}else await route.continue();});
 await page.getByRole('button',{name:'Submit quiz'}).click();await expect(page.getByText('100 / 100',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry saving result',exact:true}).click();await expect(page.getByText('Result saved to your dashboard.',{exact:true})).toBeVisible();await page.reload();await goto(page,'/dashboard');await expect(page.locator('.stats-grid .stat').last()).toHaveText('100');
});
