class VoiceCall {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.peer = null;
        this.callDocRef = null;
        this.callTimer = null;
        this.callStartTime = null;
        this.currentCallData = null;
        this.isCaller = false;
        this.callStatus = 'idle';

        this.ringtone = new Audio('https://firebasestorage.googleapis.com/v0/b/football-az-5a50d.appspot.com/o/%D8%B5%D9%88%D8%AA%20%D8%B1%D9%86%D9%8A%D9%86%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81.mp3?alt=media&token=2156da03-c2dd-4547-9b41-66d19ffa6b57');
        this.callSound = new Audio('https://firebasestorage.googleapis.com/v0/b/football-az-5a50d.appspot.com/o/%D8%B5%D9%88%D8%AA%20%D8%B1%D9%86%D9%8A%D9%86%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81.mp3?alt=media&token=2156da03-c2dd-4547-9b41-66d19ffa6b57');

        this.createCallModal();
        this.setupEventListeners();
    }

    createCallModal() {
        this.callModal = document.createElement('div');
        this.callModal.id = 'voice-call-modal';
        this.callModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            z-index: 2000;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            color: white;
        `;

        this.callModal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <img id="caller-avatar" src="" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid white; margin-bottom: 15px;">
                <h2 id="call-status">جاري الاتصال...</h2>
                <p id="call-timer">00:00</p>
                <p id="caller-name"></p>
            </div>
            <div style="display: flex; gap: 20px;">
                <button id="end-call-btn" style="background: #d63031; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 1.5rem;">
                    <i class="fas fa-phone-slash"></i>
                </button>
                <button id="answer-call-btn" style="background: #00b894; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 1.5rem; display: none;">
                    <i class="fas fa-phone"></i>
                </button>
            </div>
        `;

        document.body.appendChild(this.callModal);
    }

    setupEventListeners() {
        document.getElementById('end-call-btn').addEventListener('click', () => this.endCall());
        document.getElementById('answer-call-btn').addEventListener('click', () => this.answerCall());
    }

    async startCall(friendId, friendName, friendAvatar) {
    try {
        if (this.callStatus !== 'idle') return;

        this.isCaller = true;
        this.callStatus = 'calling';

        this.currentCallData = {
            friendId,
            friendName: friendName || 'مستخدم',
            friendAvatar: friendAvatar || 'https://via.placeholder.com/150'
        };

        this.showCallModal(`جاري الاتصال بـ ${this.currentCallData.friendName}`, this.currentCallData.friendAvatar);
        this.playRingtone();

        const callId = `${this.currentUser.uid}_${friendId}_${Date.now()}`;
        this.callDocRef = firebase.database().ref(`calls/${callId}`);

        await this.callDocRef.set({
            callerId: this.currentUser.uid,
            callerName: this.currentUser.displayName || 'مستخدم',
            callerAvatar: this.currentUser.photoURL || 'https://via.placeholder.com/150',
            calleeId: friendId,
            calleeName: friendName || 'مستخدم',
            status: 'calling',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

            setTimeout(() => {
                if (this.callStatus === 'calling') {
                    this.endCallWithError();
                }
            }, 30000);

        } catch (error) {
            console.error('Error starting call:', error);
            this.endCallWithError();
        }
    }

    async answerCall() {
        try {
            if (this.callStatus !== 'idle' && this.callStatus !== 'calling') return;

            this.stopRingtone();
            this.callStatus = 'answered';

            document.getElementById('answer-call-btn').style.display = 'none';
            document.getElementById('call-status').textContent = `مكالمة مع ${this.currentCallData.callerName || 'المتصل'}`;

            this.callSound.loop = true;
            this.callSound.play().catch(e => console.error('Error playing call sound:', e));

            await this.callDocRef.update({
                status: 'answered',
                answeredAt: firebase.database.ServerValue.TIMESTAMP
            });

            this.startCallTimer();

        } catch (error) {
            console.error('Error answering call:', error);
            this.endCallWithError();
        }
    }

    endCallWithError() {
        this.endCall();
        showNotification('حدث خطأ في الاتصال، يرجى التحقق من اتصال الإنترنت', 'error');
    }

    endCall() {
        try {
            this.stopRingtone();
            this.stopCallSound();
            this.stopCallTimer();

            if (this.callDocRef) {
                this.callDocRef.update({
                    status: 'ended',
                    endedAt: firebase.database.ServerValue.TIMESTAMP
                });
                this.callDocRef.remove();
                this.callDocRef.off();
                this.callDocRef = null;
            }

            this.callModal.style.display = 'none';
            this.currentCallData = null;
            this.callStatus = 'idle';

        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    showCallModal(statusText, avatarUrl = '') {
        this.callModal.style.display = 'flex';
        document.getElementById('call-status').textContent = statusText;

        const name = this.isCaller
            ? this.currentCallData?.friendName
            : this.currentCallData?.callerName;

        document.getElementById('caller-name').textContent = name || 'مجهول';
        document.getElementById('caller-avatar').src = avatarUrl;

        if (!this.isCaller) {
            document.getElementById('answer-call-btn').style.display = 'block';
        }
    }

    playRingtone() {
        this.ringtone.loop = true;
        this.ringtone.play().catch(e => console.error('Error playing ringtone:', e));
    }

    stopRingtone() {
        this.ringtone.pause();
        this.ringtone.currentTime = 0;
    }

    stopCallSound() {
        this.callSound.pause();
        this.callSound.currentTime = 0;
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            document.getElementById('call-timer').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        document.getElementById('call-timer').textContent = '00:00';
    }
}

// ========= تهيئة النظام =========

let voiceCall = null;

function initializeVoiceCall(currentUser) {
    voiceCall = new VoiceCall(currentUser);
    setupIncomingCallListener(currentUser);
    setupBackgroundCallHandler();
}

// ======= الاستماع لمكالمات واردة ========

// في ملف voice-call.js
function setupIncomingCallListener(currentUser) {
    firebase.database().ref('calls')
        .orderByChild('calleeId')
        .equalTo(currentUser.uid)
        .on('child_added', snapshot => {
            const callData = snapshot.val();
            if (callData.status === 'calling' && voiceCall.callStatus === 'idle') {
                // جلب بيانات المتصل الحقيقية من قاعدة البيانات
                firebase.database().ref(`users/${callData.callerId}`).once('value')
                    .then(userSnapshot => {
                        const userData = userSnapshot.val();
                        if (userData) {
                            voiceCall.currentCallData = {
                                callId: snapshot.key,
                                callerId: callData.callerId,
                                callerName: userData.username || callData.callerName,
                                callerAvatar: userData.profilePic || callData.callerAvatar
                            };
                            voiceCall.callDocRef = firebase.database().ref(`calls/${snapshot.key}`);
                            
                            showIncomingCallNotification({
                                ...callData,
                                callerName: userData.username || callData.callerName,
                                callerAvatar: userData.profilePic || callData.callerAvatar
                            }, snapshot.key);
                        }
                    });
            }
        });
}

function showIncomingCallNotification(callData, callId) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`مكالمة واردة من ${callData.callerName}`, {
            body: 'اضغط للرد على المكالمة',
            icon: callData.callerAvatar || 'https://via.placeholder.com/150',
            vibrate: [200, 100, 200]
        });

        notification.onclick = () => {
            window.focus();
            voiceCall.showCallModal(`مكالمة من ${callData.callerName}`, callData.callerAvatar);
            voiceCall.playRingtone();
        };
    }

    if (document.visibilityState === 'visible') {
        voiceCall.showCallModal(`مكالمة من ${callData.callerName}`, callData.callerAvatar);
        voiceCall.playRingtone();
    } else {
        // إذا كانت التبويبة غير مرئية، نستخدم Service Worker لإظهار الإشعار
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`مكالمة واردة من ${callData.callerName}`, {
                    body: 'اضغط للرد على المكالمة',
                    icon: callData.callerAvatar || 'https://via.placeholder.com/150',
                    vibrate: [200, 100, 200],
                    data: {
                        callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName,
                        callerAvatar: callData.callerAvatar
                    }
                });
            });
        }
    }
}

function setupBackgroundCallHandler() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    }
}

// ======== بدء التهيئة عند تحميل الصفحة ========
document.addEventListener('DOMContentLoaded', async () => {
    if ('Notification' in window) {
        await Notification.requestPermission();
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializeVoiceCall(user);
        }
    });
});
