document.addEventListener('DOMContentLoaded', () => {
    if (typeof barba !== 'undefined') {
        barba.init({
            transitions: [{
                name: 'opacity-transition',
                leave(data) {
                    return gsap.to(data.current.container, {
                        opacity: 0,
                        duration: 0.25,
                        ease: "power2.inOut"
                    });
                },
                enter(data) {
                    return gsap.from(data.next.container, {
                        opacity: 0,
                        duration: 0.25,
                        ease: "power2.inOut"
                    });
                }
            }]
        });

        // Re-execute scripts on page change so charts and logic keep working
        barba.hooks.after((data) => {
            const scripts = data.next.container.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                if (script.innerHTML) {
                    newScript.appendChild(document.createTextNode(script.innerHTML));
                }
                script.parentNode.replaceChild(newScript, script);
            });
            
            // Dispatch custom event if scripts rely on DOMContentLoaded
            window.dispatchEvent(new Event('DOMContentLoaded'));
        });
    }
});
