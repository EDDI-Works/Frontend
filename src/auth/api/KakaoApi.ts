import axios from "axios";



export const useKakaoLogin = () => {

    const requestKakaoLoginToSpring = async () => {
        try {

            const springAxiosInstance = axios.create({
                baseURL: import.meta.env.VITE_SPRING_API,
                withCredentials: true,
            });
            const res = await springAxiosInstance.get("/authentication/kakao/link");
            if (!res.data) throw new Error("응답에 URL이 없습니다.");


            const popup = window.open(res.data, "_blank", "width=500,height=600");
            if (!popup) return alert("팝업 차단되어 있습니다.");

            const receiveMessage = (event: MessageEvent) => {
                // if (event.origin !== import.meta.env.VITE_ORIGIN) return;

                console.log("📩 받은 메시지 데이터:", event.data);

                const {accessToken, isNewUser, user} = event.data;
                const MAIN_CONTAINER_URL = import.meta.env.VITE_MAIN_CONTAINER_URL as string;
                const VITE_MAIN_TERMS_URL = import.meta.env.VITE_MAIN_TERMS_URL as string;

                console.log("🔑 accessToken:", accessToken);
                console.log("👤 isNewUser:", isNewUser);
                console.log("📍 MAIN_CONTAINER_URL:", MAIN_CONTAINER_URL);

                // accessToken이 없으면 처리하지 않음
                if (!accessToken) {
                    console.warn("⚠️ accessToken이 없습니다!");
                    return;
                }

                window.removeEventListener("message", receiveMessage);

                if (isNewUser) {
                    // 신규 사용자: 임시 토큰 저장
                    console.log("🆕 신규 사용자 처리");
                    sessionStorage.setItem("tempToken", accessToken);
                    sessionStorage.setItem("userInfo", JSON.stringify(user));
                    localStorage.setItem("isNewUser", JSON.stringify(isNewUser));
                    console.log("로그인 결과 : " + isNewUser);
                    window.location.href = VITE_MAIN_TERMS_URL;
                } else {
                    // 기존 사용자: 로그인 완료
                    console.log("✅ 기존 사용자 로그인 성공");
                    console.log("💾 localStorage 저장 시작...");
                    localStorage.setItem("isLoggedIn", "wxx-sdwsx-ds=!>,?");
                    localStorage.setItem("userToken", accessToken);
                    localStorage.setItem("nickname", user.nickname);
                    console.log("💾 저장 완료 - isLoggedIn:", localStorage.getItem("isLoggedIn"));
                    console.log("💾 저장 완료 - userToken:", localStorage.getItem("userToken"));
                    console.log("🚀 페이지 이동:", MAIN_CONTAINER_URL);
                    window.location.href = MAIN_CONTAINER_URL;
                }

                try {
                    popup.close();
                } catch {
                }
            };

            window.addEventListener("message", receiveMessage);
        } catch (error) {
            console.error(error);
        }
    }

    const requestRegister = async () => {
        try {

            const springAxiosInstance = axios.create({
                baseURL: import.meta.env.VITE_SPRING_API,
                withCredentials: true,
            });
            const accessToken = sessionStorage.getItem("tempToken");
            let userInfo = null;
            const user = sessionStorage.getItem("userInfo");

            if (user) {
                userInfo = JSON.parse(user);
                userInfo.loginType = "KAKAO";
            }
            console.log(userInfo);

            const res = await springAxiosInstance.post(
                "/account/register",
                userInfo,
                {
                    headers: {
                        "Authorization": accessToken
                    }
                }
            );

            localStorage.setItem("isLoggedIn", "wxx-sdwsx-ds=!>,?");
            localStorage.setItem("userToken", res.data);
            localStorage.removeItem("tempToken");
            window.location.href = "/";

        }catch (error) {
            console.error(error);
            return;
        }
    }









    return { requestKakaoLoginToSpring, requestRegister };
};
