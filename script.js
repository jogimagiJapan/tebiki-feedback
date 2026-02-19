/**
 * Tebiki動画改善フィードバック収集ツール - Frontend (JS)
 */

// GAS Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzldyY9xFc0nRjlfO_FhSK574x-vNNjuI9RfQCHLG1k27JiC53b9iHS0kaMvq-hIww/exec';

document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedback-form');
    const videoUrlInput = document.getElementById('video-url');
    const videoTitleContainer = document.getElementById('video-title-container');
    const videoTitleDisplay = document.getElementById('video-title');
    const userNameInput = document.getElementById('user-name');
    const submitBtn = document.getElementById('submit-btn');
    const formContainer = document.getElementById('form-container');
    const successContainer = document.getElementById('success-container');
    const resetBtn = document.getElementById('reset-btn');

    // 1. LocalStorageから名前を復元
    const storedName = localStorage.getItem('tebiki_user_name');
    if (storedName) {
        userNameInput.value = storedName;
    }

    // 2. URL入力時のタイトル取得ロジック
    videoUrlInput.addEventListener('input', debounce(() => {
        const url = videoUrlInput.value.trim();
        const videoIdMatch = url.match(/videos\/(\d+)/);

        if (videoIdMatch) {
            const videoId = `videos/${videoIdMatch[1]}`;
            fetchVideoTitle(videoId);
        } else {
            hideVideoTitle();
        }
    }, 500));

    // 3. フォーム送信処理
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 二重送信防止
        submitBtn.disabled = true;
        submitBtn.querySelector('.spinner').classList.remove('hide');
        submitBtn.querySelector('.btn-text').textContent = '送信中...';

        const formData = {
            url: videoUrlInput.value.trim(),
            title: videoTitleDisplay.textContent || 'タイトル取得不可',
            category: document.getElementById('category').value,
            feedback: document.getElementById('feedback').value.trim(),
            userName: userNameInput.value.trim()
        };

        // 名前をLocalStorageに保存
        localStorage.setItem('tebiki_user_name', formData.userName);

        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', // CORSを避けるための設定（レスポンスは読めないが送信は可能）
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // no-cors の場合、エラーでも成功でも不透明なレスポンスが返るため
            // 送信完了とみなしてUIを切り替える
            showSuccess();

        } catch (error) {
            console.error('Submission error:', error);
            alert('送信中にエラーが発生しました。時間をおいて再度お試しください。');
            submitBtn.disabled = false;
            submitBtn.querySelector('.spinner').classList.add('hide');
            submitBtn.querySelector('.btn-text').textContent = '送信する';
        }
    });

    // 4. 「続けて報告する」ボタン
    resetBtn.addEventListener('click', () => {
        feedbackForm.reset();
        // 名前は残す
        const storedName = localStorage.getItem('tebiki_user_name');
        if (storedName) userNameInput.value = storedName;

        hideVideoTitle();
        successContainer.classList.add('hide');
        formContainer.classList.remove('hide');
        submitBtn.disabled = false;
        submitBtn.querySelector('.spinner').classList.add('hide');
        submitBtn.querySelector('.btn-text').textContent = '送信する';
    });

    // --- Helper Functions ---

    async function fetchVideoTitle(videoId) {
        try {
            const response = await fetch(`${GAS_URL}?id=${videoId}`);
            const data = await response.json();

            if (data.title) {
                videoTitleDisplay.textContent = `動画：${data.title}`;
                videoTitleContainer.classList.remove('hide');
            } else {
                hideVideoTitle();
            }
        } catch (error) {
            console.warn('Title fetch error:', error);
            hideVideoTitle();
        }
    }

    function hideVideoTitle() {
        videoTitleContainer.classList.add('hide');
        videoTitleDisplay.textContent = '';
    }

    function showSuccess() {
        formContainer.classList.add('hide');
        successContainer.classList.remove('hide');
        successContainer.classList.add('fade-in');
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
});
