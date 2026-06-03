import bs4
import re

file_path = r'c:\Users\TIMON\Desktop\GENE\genelab\frontend\pages\login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

soup = bs4.BeautifulSoup(html, 'html.parser')

login_form = soup.find('div', id='panel-login') or soup.find('div', class_=re.compile(r'sign-in-container'))
signup_form = soup.find('div', id='panel-signup') or soup.find('div', class_=re.compile(r'sign-up-container'))

# Clean up classes for compact fit
def compact_form(form_div, is_signup):
    if not form_div: return ""
    # Update container classes
    form_div['class'] = ['w-full', 'transition-opacity', 'duration-300']
    if is_signup:
        form_div['class'].append('hidden')
    
    # Make headings smaller
    for h2 in form_div.find_all('h2'):
        h2['class'] = ['text-2xl', 'font-display', 'font-extrabold', 'text-white']
    for p in form_div.find_all('p'):
        p['class'] = ['mt-1', 'text-xs', 'text-slate-400']
        
    # Make inputs compact
    for inp in form_div.find_all(['input', 'select']):
        if 'class' in inp.attrs:
            classes = [c for c in inp['class'] if not c.startswith('py-') and not c.startswith('p-') and not c.startswith('text-')]
            classes.extend(['py-2', 'px-3', 'text-sm', 'bg-slate-900/60', 'border', 'border-white/20', 'text-white', 'rounded-lg'])
            inp['class'] = classes
            # Fix padding for icons
            if 'style' in inp.attrs:
                inp['style'] = re.sub(r'padding:.*?;', 'padding: 0.5rem 0.5rem 0.5rem 2.2rem !important;', inp['style'])
            else:
                inp['style'] = 'padding: 0.5rem 0.5rem 0.5rem 2.2rem !important;'

    # Make icons smaller
    for span in form_div.find_all('span', class_='material-symbols-outlined'):
        if span.parent.name == 'div' and 'relative' in span.parent.get('class', []):
            if 'style' in span.attrs:
                span['style'] = re.sub(r'font-size:\s*\d+px.*?;', 'font-size: 16px !important;', span['style'])
            else:
                span['style'] = 'font-size: 16px !important;'
                
    # Reduce margins/gaps
    for div in form_div.find_all('div', class_=re.compile(r'mb-\d')):
        div['class'] = [c if not c.startswith('mb-') else 'mb-3' for c in div['class']]
    for div in form_div.find_all('div', class_=re.compile(r'gap-y-\d')):
        div['class'] = [c if not c.startswith('gap-y-') else 'gap-y-2' for c in div['class']]
    for div in form_div.find_all('div', class_=re.compile(r'space-y-\d')):
        div['class'] = [c if not c.startswith('space-y-') else 'space-y-2' for c in div['class']]
        
    # Reduce button padding
    for btn in form_div.find_all('button', type='submit'):
        btn['class'] = ['btn-premium', 'btn-cyan', 'w-full', 'rounded-lg', 'font-bold', 'tracking-wide', 'mt-3', 'py-2', 'text-sm']
        
    for btn in form_div.find_all('button', class_=re.compile(r'google-auth-btn')):
        btn['class'] = ['google-auth-btn', 'js-google-signin-btn', 'w-full', 'rounded-lg', 'border', 'border-white/15', 'bg-white/5', 'px-3', 'py-2', 'text-xs', 'font-semibold', 'text-white', 'transition-all', 'hover:border-cyan/60', 'hover:bg-cyan/10', 'flex', 'items-center', 'justify-center', 'gap-2']

    return str(form_div)

login_html = compact_form(login_form, False)
signup_html = compact_form(signup_form, True)

new_main_content = f"""
    <main class="relative z-10 w-full h-screen overflow-hidden flex flex-col md:flex-row pointer-events-none">
        
        <!-- Left Side: Branding (Transparent for DNA canvas) -->
        <div class="hidden md:flex w-[45%] h-full flex-col justify-center px-12 xl:px-20 relative z-10">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,180,216,0.2)] backdrop-blur-md">
                    <svg viewBox="0 0 100 100" class="w-8 h-8">
                        <g transform="translate(10, 10)">
                            <path d="M16 10 C 32 10, 48 70, 64 70" fill="none" stroke="var(--cyan)" stroke-width="5" stroke-linecap="round" />
                            <path d="M16 70 C 32 70, 48 10, 64 10" fill="none" stroke="var(--violet)" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
                            <circle cx="16" cy="10" r="4.5" fill="#ffffff" />
                            <circle cx="16" cy="70" r="4.5" fill="#ffffff" />
                            <circle cx="64" cy="70" r="4.5" fill="#ffffff" />
                            <circle cx="64" cy="10" r="4.5" fill="#ffffff" />
                        </g>
                    </svg>
                </div>
                <h1 class="text-4xl font-display font-extrabold text-white tracking-wide drop-shadow-lg">GeneLab</h1>
            </div>
            <h2 class="text-4xl xl:text-5xl font-display font-extrabold text-white leading-tight drop-shadow-md">
                Unlock your <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan to-violet">clinical potential.</span>
            </h2>
        </div>

        <!-- Right Side: Panel (Takes full height, side-by-side) -->
        <div class="w-full md:w-[55%] h-full bg-slate-900/90 backdrop-blur-2xl border-l border-white/10 flex flex-col justify-center px-6 sm:px-12 lg:px-20 relative z-20 pointer-events-auto shadow-2xl">
            
            <div class="w-full max-w-md mx-auto">
                <!-- Mobile Branding -->
                <div class="flex md:hidden items-center justify-center gap-2 mb-6">
                    <div class="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" class="w-5 h-5">
                            <g transform="translate(10, 10)">
                                <path d="M16 10 C 32 10, 48 70, 64 70" fill="none" stroke="var(--cyan)" stroke-width="5" stroke-linecap="round" />
                                <path d="M16 70 C 32 70, 48 10, 64 10" fill="none" stroke="var(--violet)" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
                            </g>
                        </svg>
                    </div>
                    <span class="font-display font-bold text-xl text-white">GeneLab</span>
                </div>

                <!-- Tabs -->
                <div class="flex items-center gap-6 mb-4 border-b border-white/10 pb-2">
                    <button id="tab-login" class="text-lg font-display font-bold text-white transition-all border-b-2 border-cyan pb-1 translate-y-[9px]">Log In</button>
                    <button id="tab-signup" class="text-lg font-display font-bold text-slate-400 hover:text-white transition-all border-b-2 border-transparent pb-1 translate-y-[9px]">Sign Up</button>
                </div>

                <!-- Forms -->
                {login_html}
                {signup_html}
            </div>
        </div>
    </main>
"""

main_tag = soup.find('main')
if main_tag:
    main_tag.replace_with(bs4.BeautifulSoup(new_main_content, 'html.parser'))

# Clean up styles
styles = soup.find('style')
if styles:
    css = styles.string
    css = re.sub(r'\.auth-container.*?{.*?}', '', css, flags=re.DOTALL)
    css = re.sub(r'\.form-container.*?{.*?}', '', css, flags=re.DOTALL)
    css = re.sub(r'\.sign-in-container.*?{.*?}', '', css, flags=re.DOTALL)
    css = re.sub(r'\.sign-up-container.*?{.*?}', '', css, flags=re.DOTALL)
    css = re.sub(r'\.glass-panel.*?{.*?}', '', css, flags=re.DOTALL)
    css += """
        .role-tile { padding: 0.35rem !important; border-radius: 0.5rem !important; background: rgba(15, 23, 42, 0.4) !important; }
        .role-tile .material-symbols-outlined { font-size: 16px !important; }
        .role-tile span.font-bold { font-size: 9px !important; }
        .auth-divider { margin: 0.75rem 0 !important; font-size: 10px !important; }
        body { overflow: hidden !important; } /* Prevent any scroll */
    """
    styles.string = css

# Update JS for tab switching
scripts = soup.find_all('script')
for script in scripts:
    if script.string and 'right-panel-active' in script.string:
        script.string = """
        document.addEventListener('DOMContentLoaded', () => {
            const tabLogin = document.getElementById('tab-login');
            const tabSignup = document.getElementById('tab-signup');
            const panelLogin = document.getElementById('panel-login');
            const panelSignup = document.getElementById('panel-signup');
            
            function showLogin() {
                if(panelSignup) panelSignup.classList.add('hidden');
                if(panelLogin) panelLogin.classList.remove('hidden');
                if(tabLogin) {
                    tabLogin.classList.add('border-cyan', 'text-white');
                    tabLogin.classList.remove('border-transparent', 'text-slate-400');
                }
                if(tabSignup) {
                    tabSignup.classList.add('border-transparent', 'text-slate-400');
                    tabSignup.classList.remove('border-cyan', 'text-white');
                }
            }
            
            function showSignup() {
                if(panelLogin) panelLogin.classList.add('hidden');
                if(panelSignup) panelSignup.classList.remove('hidden');
                if(tabSignup) {
                    tabSignup.classList.add('border-cyan', 'text-white');
                    tabSignup.classList.remove('border-transparent', 'text-slate-400');
                }
                if(tabLogin) {
                    tabLogin.classList.add('border-transparent', 'text-slate-400');
                    tabLogin.classList.remove('border-cyan', 'text-white');
                }
            }

            if (tabLogin && tabSignup) {
                tabLogin.addEventListener('click', showLogin);
                tabSignup.addEventListener('click', showSignup);
            }
            
            if (window.location.hash === '#signup') {
                showSignup();
            }
        });
        """

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))
