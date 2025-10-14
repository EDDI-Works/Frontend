import React from "react";
import CalendarHeader from "../components/calendar/CalendarHeader";
import MonthGrid from "../components/calendar/MonthGrid";
import DayPanel from "../components/calendar/DayPanel";
import WeekGrid from "../components/calendar/WeekGrid";
import { useMeeting } from "../hooks/useMeeting.ts";
import { LayoutGroup } from "framer-motion";
import { MeetingSubnav } from "./MeetingLayout";
import { meetingApi } from "../../api/meetingApi";

export default function CalendarPage() {
    const {
        cursor,
        setCursor,
        selectedDate,
        setSelectedDate,
        monthWeeks,
    } = useMeeting();

    // 서버에서 가져온 미팅들
    type UiMeeting = { id: string; title: string; allDay?: boolean; start: string; end: string; team?: string; teams?: string[]; createdAt?: string; };
    const [remoteMeetings, setRemoteMeetings] = React.useState<UiMeeting[]>([]);

    //  YYYY-MM-DD 포맷터
    const fmtYmd = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    // 월 전체 범위(from/to)
    const monthStart = React.useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
    const monthEnd   = React.useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

    // meetingApi로 월 범위 목록 조회
    React.useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await meetingApi.getMeetingList({
                    from: fmtYmd(monthStart),
                    to: fmtYmd(monthEnd),
                });
                const ui = (res?.items ?? []).map(it => ({
                    id: it.publicId,
                    title: it.title,
                    allDay: !!it.allDay,
                    start: it.start,
                    end: it.end,
                    createdAt: it.updatedAt ?? undefined,
                }));
                if (alive) setRemoteMeetings(ui);
            } catch {
                if (alive) setRemoteMeetings([]); // 실패 시 빈 배열로만 처리
            }
        })();
        return () => { alive = false; };
    }, [monthStart, monthEnd]);

    // DayPanel 필터
    const isSameDate = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const meetingsOfDayLocal = (d: Date) =>
        (remoteMeetings ?? []).filter(
            (m) =>
                isSameDate(d, new Date(m.start)) ||
                (m.allDay && d >= startOfDay(new Date(m.start)) && d <= startOfDay(new Date(m.end)))
        );

    const panelW = 360;
    const [mode, setMode] = React.useState<"week" | "month">("month");

    const OVERLAY_BREAKPOINT = 1100;

    // 1100px 미만이면 DayPanel을 모달(overlay)로 전환
    const [overlay, setOverlay] = React.useState(false);
    const [panelOpen, setPanelOpen] = React.useState(false);

    React.useEffect(() => {
        const onResize = () => {
            const isOverlay = window.innerWidth < OVERLAY_BREAKPOINT;
            setOverlay(isOverlay);
            setPanelOpen(false); // 폭 바뀔 때 자동 오픈 금지
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const handleSelectDate = (d: Date) => {
        setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        if (overlay) {
            setPanelOpen(true); // 좁은 화면에서만: 날짜 클릭 시 모달 오픈
        }
    };

    // 닫기 시 선택도 해제(overlay일 때만)
    const handleClosePanel = () => {
        setPanelOpen(false);
        if (overlay) {
            setSelectedDate(null as unknown as Date); // 선택 라인 제거
        }
    };

    const goToDay = (offset: number) => {
        const base = selectedDate ?? cursor;
        const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
        setSelectedDate(next);
        if (
            next.getFullYear() !== cursor.getFullYear() ||
            next.getMonth() !== cursor.getMonth()
        ) {
            setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
        }
    };
    const goPrevDay = () => goToDay(-1);
    const goNextDay = () => goToDay(1);

    const handleToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setCursor(today);
        setSelectedDate(today);
    };

    // Week 모드에서 좁은 폭일 때만 고정 높이로 눌림 방지
    const containerHeightClass = overlay
        ? (mode === "week" ? "h-[640px]" : "h-auto")
        : "h-auto xl:h-[720px] 2xl:h-[800px]";

    return (
        <LayoutGroup>
            <div className="min-h-[100dvh] w-full bg-[#F5F6F8] px-8 py-6 flex flex-col">
                {/* 페이지 타이틀 */}
                <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 mb-6 flex items-center min-h-0">
                    <div className="flex items-baseline gap-2 shrink-0">
                        <h1 className="text-[18px] font-bold text-[#1F2937] leading-none">
                            나의 미팅 일정
                        </h1>
                        <p className="text-[12px] text-[#98A2B3] leading-none">
                            현재 미팅 일정을 확인해보세요
                        </p>
                    </div>

                    {/* 구분선 */}
                    <div className="ml-3 flex-1 h-px bg-gradient-to-r from-[#E5E7EB] via-[#E5E7EB] to-transparent rounded-full" />
                </div>

                {/* 전체: Subnav + (달력/일정) 한 카드 */}
                <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1920px] px-6 pb-4 flex-1 flex">
                    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(31,41,55,0.06)] min-h-0">
                        {/* MeetingSubnav */}
                        <div className="shrink-0">
                            <MeetingSubnav />
                        </div>

                        {/* 카드 본문 */}
                        <div className="flex-1 min-h-0 px-8 py-6">
                            <div
                                className={`grid min-h-0 gap-4 ${containerHeightClass}`}
                                style={{
                                    gridTemplateColumns: overlay ? "1fr" : `1fr ${panelW}px`,
                                }}
                            >
                                {/* 좌측: 달력 */}
                                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(31,41,55,0.06)] border border-neutral-200/80">
                                    <CalendarHeader
                                        cursor={cursor}
                                        setCursor={setCursor}
                                        variant="inside"
                                        mode={mode}
                                        onModeChange={setMode}
                                        onToday={handleToday}
                                    />
                                    <div className="flex-1 min-h-0">
                                        {mode === "month" ? (
                                            <MonthGrid
                                                cursor={cursor}
                                                weeks={monthWeeks}
                                                meetings={remoteMeetings}
                                                onSelectDate={handleSelectDate}
                                                selectedDate={selectedDate}
                                            />
                                        ) : (
                                            <WeekGrid
                                                cursor={cursor}
                                                meetings={remoteMeetings}
                                                onSelectDate={handleSelectDate}
                                                selectedDate={selectedDate}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* 우측: DayPanel (데스크탑) */}
                                {!overlay && (
                                    <div className="h-full min-h-0 overflow-auto rounded-xl shadow-[0_4px_24px_rgba(31,41,55,0.06)] border border-neutral-200/80">
                                        <DayPanel
                                            date={selectedDate ?? new Date()}
                                            items={selectedDate ? meetingsOfDayLocal(selectedDate) : []}
                                            onPrevDay={goPrevDay}
                                            onNextDay={goNextDay}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 좁은 화면: DayPanel 모달 (날짜 클릭 시에만 열림) */}
                {overlay && panelOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px]"
                            onClick={handleClosePanel}
                        />
                        <div className="fixed inset-0 z-[70] flex items-start justify-center px-8 sm:px-10 pt-28">
                            <div className="relative w-[min(540px,100%)] overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(31,41,55,0.18)]">
                                <button
                                    aria-label="close"
                                    onClick={handleClosePanel}
                                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                                <DayPanel
                                    date={selectedDate ?? new Date()}
                                    items={selectedDate ? meetingsOfDayLocal(selectedDate) : []}
                                    onPrevDay={goPrevDay}
                                    onNextDay={goNextDay}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </LayoutGroup>
    );
}