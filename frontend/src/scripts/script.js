document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/google-client-id')
        .then(response => response.json())
        .then(data => {
            const metaTag = document.createElement('meta');
            metaTag.name = 'google-signin-client_id';
            metaTag.content = data.clientId;
            document.head.appendChild(metaTag);
        })
        .catch(error => {
            console.error('Error fetching Google Client ID:', error);
        });
});

document.getElementById('toggle-theme').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

function onSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    const userId = Math.floor(1000 + Math.random() * 9000);
    const userName = profile.getName();
    const userEmail = profile.getEmail();
    const userIsAnalyst = false;
    const userIsUser = true;

    // Check if user already exists and register if not
    fetch('/api/checkUser', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.exists) {
            // Register the new user
            fetch('/api/registerUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: userId,
                    name: userName,
                    email: userEmail,
                    isAnalyst: userIsAnalyst,
                    isUser: userIsUser
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('User registered:', data);
            })
            .catch(error => console.error('Error registering user:', error));
        } else {
            console.log('User already exists.');
        }
    })
    .catch(error => console.error('Error checking user:', error));
}
