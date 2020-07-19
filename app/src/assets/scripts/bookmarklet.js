function hipbt() {
    var d = document,
        b = document.body,
        s = document.createElement('scr' + 'ipt');
    try {
        s.setAttribute('src', 'https://2738416dc415.eu.ngrok.io/assets/scripts/bbc-sounds.js?token=abc123');
        s.setAttribute('async', true);
        s.setAttribute('defer', true);
        b.appendChild(s);
    } catch (e) {
        alert('There was an error');
    }
}
