// W단계 페이지 — 인지갈등 사진 + 질문 입력 + Firebase 실시간 피드
Pages['w-page'] = {

    render(containerId) {
        const kEntries   = this.getKEntries();
        const firebaseOk = !!window._firebaseReady;
        const student    = App.getStudent();

        document.getElementById(containerId).innerHTML = `
        <div class="page-container" style="max-width:1100px;">
            <div class="page-header">
                <div class="page-title">❓ W — 이 사진을 보고 궁금한 점을 적어보세요</div>
            </div>

            <!-- 2열 레이아웃: 사진 | K요약 + 질문입력 -->
            <div class="w-two-col">

                <!-- 왼쪽: 교사 업로드 인지갈등 사진 -->
                <div class="w-photo-area">
                    <div id="w-photo-container" class="w-photo-placeholder">
                        <div style="text-align:center;color:#bbb;padding:40px 20px;">
                            <div style="font-size:48px;margin-bottom:14px;">🖼️</div>
                            <div style="font-size:14px;">
                                ${firebaseOk
                                    ? '사진을 불러오는 중...'
                                    : 'Firebase 설정 후<br>교사가 사진을 등록할 수 있습니다'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 오른쪽: K요약 + 질문 입력 -->
                <div class="w-input-area">

                    <!-- K단계 내가 썼던 것 (읽기 전용) -->
                    <div class="content-card" style="margin-bottom:16px;">
                        <div class="w-section-label">📋 K단계에서 내가 썼던 것</div>
                        ${kEntries.length > 0
                            ? `<ul class="w-k-summary">
                                ${kEntries.map(e => `
                                <li>• ${this.escapeHtml(e.studentInput)}</li>`).join('')}
                               </ul>`
                            : '<p style="color:#bbb;font-size:13px;margin-top:6px;">K단계 기록이 없습니다.</p>'
                        }
                    </div>

                    <!-- 질문 입력 -->
                    <div class="content-card">
                        <div class="w-section-label">❓ 이 사진을 보고 궁금한 점은?</div>
                        <textarea class="form-input" id="w-input" rows="3"
                                  placeholder="궁금한 점을 자유롭게 적어보세요..."
                                  maxlength="200"
                                  style="resize:none;margin-top:8px;"></textarea>
                        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                            <button class="chat-send-btn" id="w-submit-btn"
                                    style="border-radius:var(--radius);padding:10px 24px;"
                                    ${!firebaseOk ? 'disabled title="Firebase 설정이 필요합니다"' : ''}>
                                질문 등록
                            </button>
                        </div>
                        <div id="w-error" class="error-msg" style="display:none;margin-top:8px;"></div>
                    </div>
                </div>
            </div>

            <!-- 실시간 질문 피드 -->
            <div class="w-live-section">
                <div class="w-live-header">
                    <span class="live-badge">🔴 LIVE</span>
                    <span style="font-weight:700;color:var(--color-primary);">우리 반 질문 (실시간)</span>
                    <span style="font-size:13px;color:#aaa;margin-left:6px;">공감 많은 순</span>
                </div>
                <div id="w-feed" class="w-feed-container">
                    <div style="text-align:center;color:#bbb;padding:32px;">
                        ${firebaseOk
                            ? '질문을 불러오는 중...'
                            : 'Firebase 연동 시 학급 전체 실시간 피드가 활성화됩니다.'}
                    </div>
                </div>
            </div>

            <button class="btn-complete" id="w-complete-btn">W단계 완료 ✓</button>
        </div>`;

        this.attachEvents();

        if (firebaseOk) {
            this.loadPhoto();
            this.subscribeQuestions(student);
        }
    },

    // K단계 입력 내역 불러오기
    getKEntries() {
        try {
            const data = localStorage.getItem(App.getKey('k_entries'));
            return data ? JSON.parse(data) : [];
        } catch (_) { return []; }
    },

    // 교사 업로드 사진 Firestore에서 로드
    async loadPhoto() {
        if (!window._firebaseReady) return;
        const { doc, getDoc } = window._firestoreFns;
        try {
            const snap = await getDoc(doc(window._db, 'settings', 'wStage'));
            const container = document.getElementById('w-photo-container');
            if (!container) return;

            if (snap.exists() && snap.data().imageUrl) {
                const { imageUrl, guideText } = snap.data();
                container.className = 'w-photo-filled';
                container.innerHTML = `
                    <img src="${imageUrl}" alt="인지갈등 유발 사진"
                         style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block;">
                    ${guideText
                        ? `<div class="w-photo-guide">${this.escapeHtml(guideText)}</div>`
                        : ''}`;
            } else {
                container.innerHTML = `
                    <div style="text-align:center;color:#bbb;padding:40px 20px;">
                        <div style="font-size:48px;margin-bottom:14px;">🖼️</div>
                        <div style="font-size:14px;">선생님이 아직 사진을 등록하지 않았어요.</div>
                    </div>`;
            }
        } catch (e) {
            console.warn('사진 로드 실패:', e);
        }
    },

    // Firebase 실시간 질문 피드 구독
    subscribeQuestions(student) {
        if (!window._firebaseReady) return;
        const { collection, onSnapshot } = window._firestoreFns;
        const myName = student?.name || '';

        const unsub = onSnapshot(
            collection(window._db, 'questions'),
            snapshot => {
                const questions = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.likes || 0) - (a.likes || 0));

                const feed = document.getElementById('w-feed');
                if (!feed) return;

                if (questions.length === 0) {
                    feed.innerHTML = `<div style="text-align:center;color:#bbb;padding:32px;">
                        아직 등록된 질문이 없습니다. 첫 번째 질문을 남겨보세요!
                    </div>`;
                    return;
                }

                feed.innerHTML = questions.map(q => {
                    const isMine = q.studentName === myName;
                    const liked  = (q.likedBy || []).includes(myName);
                    return `
                    <div class="feed-item${isMine ? ' feed-item-mine' : ''}">
                        <div class="feed-item-text">${this.escapeHtml(q.text)}</div>
                        <div class="feed-item-footer">
                            <span class="feed-item-name">${this.escapeHtml(q.studentName || '?')}</span>
                            <button class="feed-like-btn${liked ? ' liked' : ''}"
                                    data-id="${q.id}"
                                    data-liked="${liked}"
                                    ${isMine ? 'disabled title="내 질문에는 공감할 수 없어요"' : ''}>
                                👋 ${q.likes || 0}
                            </button>
                        </div>
                    </div>`;
                }).join('');

                // 공감 버튼 이벤트 (이벤트 위임)
                feed.querySelectorAll('.feed-like-btn:not([disabled])').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.toggleLike(btn.dataset.id, btn.dataset.liked === 'true', myName);
                    });
                });
            },
            err => { console.warn('실시간 피드 오류:', err); }
        );

        // 페이지 이탈 시 구독 자동 해제 (app.js navigate()에서 호출)
        window._pageUnsubscribe = unsub;
    },

    // 공감 투표 (중복 방지 — likedBy 배열로 관리)
    async toggleLike(questionId, isLiked, myName) {
        if (!window._firebaseReady || !myName) return;
        const { doc, updateDoc, increment, arrayUnion, arrayRemove } = window._firestoreFns;
        const qRef = doc(window._db, 'questions', questionId);
        try {
            if (isLiked) {
                await updateDoc(qRef, { likes: increment(-1), likedBy: arrayRemove(myName) });
            } else {
                await updateDoc(qRef, { likes: increment(1),  likedBy: arrayUnion(myName)  });
            }
        } catch (e) { console.warn('공감 처리 실패:', e); }
    },

    // 질문 등록 (Firestore에 추가)
    async submitQuestion() {
        if (!window._firebaseReady) return;
        const input   = document.getElementById('w-input');
        const text    = input.value.trim();
        const errEl   = document.getElementById('w-error');
        const student = App.getStudent();

        if (!text) return;
        if (!student) {
            errEl.textContent = '로그인 정보가 없습니다.';
            errEl.style.display = 'block';
            return;
        }

        const btn = document.getElementById('w-submit-btn');
        btn.disabled = true;
        errEl.style.display = 'none';

        try {
            const { collection, addDoc } = window._firestoreFns;
            await addDoc(collection(window._db, 'questions'), {
                studentName:   student.name,
                studentClass:  student.class,
                studentNumber: student.number,
                text,
                likes:   0,
                likedBy: [],
                timestamp: Date.now()
            });
            input.value = '';
            // W단계 참여 기록 (완료 버튼 활성화를 위해 localStorage에도 저장)
            localStorage.setItem(App.getKey('w_submitted'), 'true');
        } catch (e) {
            errEl.textContent = '질문 등록에 실패했습니다. 네트워크를 확인해주세요.';
            errEl.style.display = 'block';
        } finally {
            if (document.getElementById('w-submit-btn')) {
                document.getElementById('w-submit-btn').disabled = false;
            }
        }
    },

    // 이벤트 연결
    attachEvents() {
        const submitBtn = document.getElementById('w-submit-btn');
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitQuestion());

        const input = document.getElementById('w-input');
        if (input) {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submitQuestion(); }
            });
        }

        document.getElementById('w-complete-btn').addEventListener('click', () => {
            App.completeStep('w');
            App.navigate('l-page');
        });
    },

    // XSS 방지
    escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
};
