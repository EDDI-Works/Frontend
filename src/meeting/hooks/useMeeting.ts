import { useMemo, useState, useEffect } from "react";
import { addDays, endOfMonth, isSameDate, startOfMonth, startOfWeek } from "../utils/date";
import { meetingApi } from "../../api/meetingApi";

type UiMeeting = {
	id: string;            // publicId 매핑
	title: string;
	allDay?: boolean;
	start: string;         // ISO
	end: string;           // ISO
	team?: string;
	teams?: string[];
	createdAt?: string;
};

export function useMeeting() {
	const [cursor, setCursor] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [query, setQuery] = useState("");

	const firstGridDay = useMemo(() => startOfWeek(startOfMonth(cursor)), [cursor]);
	const monthDays = useMemo(() => new Array(42).fill(0).map((_, i) => addDays(firstGridDay, i)), [firstGridDay]);
	const monthWeeks = useMemo(() => chunk(monthDays, 7), [monthDays]);

	// 서버 조회 결과를 보관 (기본: 빈 배열)
	const [meetings, setMeetings] = useState<UiMeeting[]>([]);

	// YYYY-MM-DD 포맷
	const fmtYmd = (d: Date) => {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	};

	// 월 범위(from/to) 계산
	const range = useMemo(() => {
		const s = startOfMonth(cursor);
		const e = endOfMonth(cursor);
		return { from: fmtYmd(s), to: fmtYmd(e) };
	}, [cursor]);

	// 현재 범위 데이터 (meetingApi 연동)
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const res = await meetingApi.getMeetingList({ from: range.from, to: range.to });
				const items = res?.items ?? [];
				// 백엔드 → UI 매핑 (publicId → id)
				let ui: UiMeeting[] = items.map(it => ({
					id: it.publicId,
					title: it.title,
					allDay: !!it.allDay,
					start: it.start,
					end: it.end,
					createdAt: it.updatedAt ?? undefined,
				}));

				// 간단한 클라이언트 검색(query) — 기존 훅 인터페이스 유지
				const q = query.trim().toLowerCase();
				if (q) ui = ui.filter(m => (m.title ?? "").toLowerCase().includes(q));

				if (alive) setMeetings(ui);
			} catch (e) {
				// 실패 시에도 UI 깨지지 않도록 — 기존처럼 빈 배열 유지
				// eslint-disable-next-line no-console
				console.warn("[useMeeting] getMeetingList failed", e);
				if (alive) setMeetings([]);
			}
		})();
		return () => { alive = false; };
	}, [range.from, range.to, query]);

	const meetingsOfDay = (d: Date) =>
		meetings.filter(
			(m) =>
				isSameDate(d, new Date(m.start)) ||
				(m.allDay && d >= startOfDay(new Date(m.start)) && d <= startOfDay(new Date(m.end)))
		);

	return {
		cursor,
		setCursor,
		selectedDate,
		setSelectedDate,
		query,
		setQuery,
		monthDays,
		monthWeeks,
		meetings,                // (동일 키) MonthGrid/WeekGrid 그대로 사용 가능
		meetingsOfDay,          // (동일 키)
	};
}

// ----- helpers (로컬 전용) -----
function chunk<T>(arr: T[], size: number) {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
