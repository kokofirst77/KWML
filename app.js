// 앱 라우터: 페이지 전환 및 전역 상태 관리
const App = {
    currentPage: null,

    // 앱 시작: 로그인 상태 확인 후 첫 화면 결정
    init() {
        const student = this.getStudent();
        this.navigate(student ? 'home' : 'login');
    },

    // 페이지 이동
    navigate(page) {
        // 이전 페이지의 setInterval 등 정리 (워드클라우드 자동갱신 등)
        if (window._pageInterval) {
            clearInterval(window._pageInterval);
            window._pageInterval = null;
        }
        this.currentPage = page;
        const appEl = document.getElementById('app');

        // 네비게이션을 숨기는 페이지 목록
        const noNavPages = ['login', 'dashboard'];
        const showNav = !noNavPages.includes(page);

        if (showNav) {
            const student = this.getStudent();
            appEl.innerHTML = Navbar.render(student) + '<div id="page-content"></div>';
            Navbar.attachEvents();
            Navbar.updateActive(page);
        } else {
            appEl.innerHTML = '<div id="page-content"></div>';
        }

        if (Pages[page]) {
            Pages[page].render('page-content');
        } else {
            document.getElementById('page-content').innerHTML =
                '<div class="page-container"><p style="color:#999;">페이지를 찾을 수 없습니다.</p></div>';
        }
    },

    // localStorage에서 학생 정보 가져오기
    getStudent() {
        const data = localStorage.getItem('kwlmlab_student');
        return data ? JSON.parse(data) : null;
    },

    // localStorage에서 학생별 완료 상태 가져오기
    getCompleted() {
        const key  = this.getKey('completed');
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : {};
    },

    // 특정 단계 완료 처리 (학생별 저장)
    completeStep(step) {
        const completed = this.getCompleted();
        completed[step] = true;
        localStorage.setItem(this.getKey('completed'), JSON.stringify(completed));
    },

    // 학생별 localStorage 키 생성 (반·번호로 구분하여 같은 PC에서 여러 학생 사용 가능)
    getKey(type) {
        const student = this.getStudent();
        if (!student) return `kwlmlab_${type}`;
        return `kwlmlab_${type}_${student.class}_${student.number}`;
    },

    // 로그아웃
    logout() {
        if (confirm('로그아웃 하시겠습니까?\n(학습 기록은 이 기기에 보존됩니다)')) {
            localStorage.removeItem('kwlmlab_student');
            this.navigate('login');
        }
    }
};

// DOM 로드 완료 후 앱 시작
// Pages 객체는 index.html의 <script> 블록에서 미리 선언됩니다
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
