import React from "react";
import Content from "./notes/Content.tsx";
import Details from "./notes/Details.tsx";

// 외부 노출 타입
export type MeetingCore = {
	id?: string;             // 서버 publicId (UUID)
	title: string;
	start: Date;
	end: Date;
	allDay: boolean;
	team?: string;
};

export type MeetingMeta = {
	location?: string;
	participants?: string;
	links: string[];
	notes: string;
};

type Props = {
	mode: "new" | "detail";
	initial: { meeting: MeetingCore; meta: MeetingMeta };
	onSave: (data: { meeting: MeetingCore; meta: MeetingMeta }) => Promise<void> | void;
	onCancel?: () => void;
	teamOptions?: readonly string[];
	canPersistBoards?: boolean;
	resetKey?: number;
	onSync?: () => Promise<void> | void;
	onDelete?: () => Promise<void> | void;
};

// dev 안전장치
function assertPublicId(id: unknown) {
	if (id != null && typeof id !== "string") {
		console.warn("[MeetingEditorBody] meeting.id는 문자열이어야 합니다.", typeof id, id);
	}
}

export default function MeetingEditorBody({
											  mode,
											  initial,
											  onSave,
											  onCancel,
											  teamOptions = [],
											  canPersistBoards = false,
											  resetKey = 0,
											  onSync,
											  onDelete,
										  }: Props) {
	// 좌측(콘텐츠)
	const [title, setTitle] = React.useState(initial.meeting.title || "");
	const [notes, setNotes] = React.useState(initial.meta.notes || "");
	const [links, setLinks] = React.useState<string[]>(initial.meta.links ?? []);
	const [linkOpen, setLinkOpen] = React.useState<boolean>(true);

	// 우측(세부 정보)
	const [allDay, setAllDay] = React.useState(!!initial.meeting.allDay);
	const [start, setStart] = React.useState<Date>(new Date(initial.meeting.start));
	const [end, setEnd] = React.useState<Date>(new Date(initial.meeting.end));
	const [team, setTeam] = React.useState<string>(initial.meeting.team || "");
	const [location, setLocation] = React.useState(initial.meta.location || "");
	const [participants, setParticipants] = React.useState(initial.meta.participants || "");

	React.useEffect(() => { assertPublicId(initial.meeting.id); }, [initial.meeting.id]);

	React.useEffect(() => {
		if (mode === "detail") {
			setTitle(initial.meeting.title || "");
			setNotes(initial.meta.notes || "");
			setLinks(initial.meta.links ?? []);
			setAllDay(!!initial.meeting.allDay);
			setStart(new Date(initial.meeting.start));
			setEnd(new Date(initial.meeting.end));
			setTeam(initial.meeting.team || "");
			setLocation(initial.meta.location || "");
			setParticipants(initial.meta.participants || "");
		} else {
			// mode === "new"
			setTitle("");
			setNotes("");
			setLinks([]);
			setTeam("");
			setLocation("");
			setParticipants("");
		}
	}, [resetKey, initial, mode]);

	// 저장
	const handleSave = React.useCallback(() => {
		onSave({
			meeting: {
				id: initial.meeting.id,
				title: title || "제목 없음",
				start, end, allDay, team,
			},
			meta: { notes, location, participants, links },
		});
	}, [title, notes, links, location, participants, start, end, allDay, team, onSave, initial.meeting.id]);

	// 싱크
	const [syncLoading, setSyncLoading] = React.useState(false);
	const handleSync = async () => {
		if (!onSync) return;
		try { setSyncLoading(true); await onSync(); } finally { setSyncLoading(false); }
	};

	// 삭제 진행 상태
	const [deleting, setDeleting] = React.useState(false);

	// 달력 카드와 동일한 그림자 값
	const calendarShadow = "shadow-[0_4px_24px_rgba(31,41,55,0.06)]";

	// 세부정보 헤더의 케밥 메뉴 상태
	const [menuOpen, setMenuOpen] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement | null>(null);
	React.useEffect(() => {
		const onDown = (e: MouseEvent) => {
			if (!menuRef.current) return;
			if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		};
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, []);

	// 헤더에 표시할 제목(실시간)
	const headerTitle = (title?.trim() || (mode === "new" ? "새 미팅" : "미팅"));

	return (
		<div className="flex-1 min-h-0 px-6 pb-8">
			{/* === 2열 레이아웃 === */}
			<div
				className="
          grid gap-6 items-stretch
          grid-cols-1
          xl:grid-cols-[minmax(0,1fr)_360px]
        "
			>
				{/* 왼쪽: 본문 카드 */}
				<section
					className={`min-w-0 self-stretch rounded-xl bg-white ${calendarShadow} flex flex-col`}
				>
					{/* 본문 헤더: 제목 반영 + 하단 구분선 + 싱크 버튼 */}
					<div
						className="
              flex items-center justify-between
              px-4 lg:px-5 py-3
              border-b border-slate-100
            "
					>
						<div
							className="
                font-medium text-slate-700
                max-w-[70%] truncate
              "
							title={headerTitle}
						>
							{headerTitle}
						</div>

						<div className="flex items-center gap-2">
							{/* 우측은 싱크 버튼만 유지 */}
							{onSync && (
								<button
									type="button"
									onClick={handleSync}
									disabled={syncLoading}
									title="서버와 다시 동기화"
									className="h-8 px-3 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition"
								>
									{syncLoading ? "싱크 중…" : "싱크 맞추기"}
								</button>
							)}
						</div>
					</div>

					{/* 본문 컨텐츠 */}
					<div className="p-4 lg:p-5 flex-1 min-h-0">
						<Content
							publicId={String(initial.meeting.id ?? "")}
							title={title} setTitle={setTitle}
							notes={notes} setNotes={setNotes}
							links={links} setLinks={setLinks}
							linkOpen={linkOpen} setLinkOpen={setLinkOpen}
							participants={participants}
							canPersistBoards={canPersistBoards}
						/>
					</div>
				</section>

				{/* 오른쪽: 세부 정보 카드 */}
				<aside
					className={`self-stretch rounded-xl bg-white ${calendarShadow} flex flex-col`}
				>
					{/* 세부 정보 헤더 + 케밥 */}
					<div className="px-4 lg:px-5 py-3 font-medium text-slate-700 flex items-center justify-between">
						<span>세부 정보</span>

						{mode === "detail" && (
							<div className="relative" ref={menuRef}>
								<button
									type="button"
									aria-haspopup="menu"
									aria-expanded={menuOpen}
									onClick={() => setMenuOpen(v => !v)}
									className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
									title="메뉴"
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
										<path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
								</button>

								{menuOpen && (
									<div
										role="menu"
										className="absolute right-0 mt-1 w-35 rounded-md border border-slate-200 bg-white py-1 shadow-md z-10"
									>
										{onDelete && (
											<button
												type="button"
												className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
												onClick={async () => {
													setMenuOpen(false);
													if (deleting) return;
													const ok = window.confirm("이 미팅을 삭제할까요? 되돌릴 수 없습니다.");
													if (!ok) return;
													try {
														setDeleting(true);
														await onDelete();
													} finally {
														setDeleting(false);
													}
												}}
											>
												{deleting ? "삭제 중…" : "삭제"}
											</button>
										)}
									</div>
								)}
							</div>
						)}
					</div>

					{/* 세부 정보 본문 */}
					<div className="p-4 lg:p-5 flex-1 min-h-0">
						<Details
							meetingId={initial.meeting.id ?? "new"}
							ownerId={""}
							allDay={allDay} setAllDay={setAllDay}
							start={start} setStart={setStart}
							end={end} setEnd={setEnd}
							team={team} setTeam={setTeam}
							teamOptions={teamOptions}
							location={location} setLocation={setLocation}
							participants={participants} setParticipants={setParticipants}
						/>
					</div>

					{/* 하단 액션: 뒤로 / 저장 (이전 수정 그대로) */}
					<div className="px-4 lg:px-5 pb-4 border-t border-slate-100">
						<div className="mt-3 flex gap-3 items-center justify-center">
							{onCancel && (
								<button
									type="button"
									onClick={onCancel}
									className="
                    h-10 w-36 px-5 rounded-lg
                    border border-slate-300
                    bg-white text-slate-700
                    hover:bg-slate-50
                    active:translate-y-[0.5px]
                    transition
                  "
								>
									뒤로
								</button>
							)}
							<button
								type="button"
								onClick={handleSave}
								disabled={!!!title.trim()}
								title={!title.trim() ? "제목을 입력해 주세요." : "저장"}
								className="
                  h-10 w-36 px-6 rounded-lg
                  bg-[#6D6CF8] text-white
                  shadow-[0_1px_0_rgba(0,0,0,0.04)]
                  hover:brightness-95
                  active:translate-y-[0.5px]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition
                "
							>
								저장
							</button>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
