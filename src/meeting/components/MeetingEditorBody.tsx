import React from "react";
import Content from "./notes/Content.tsx";
import Details from "./notes/Details.tsx";

// 외부 노출 타입
export type MeetingCore = {
	id?: string;
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
	// 팀 옵션은 서버/상위에서 내려줄 수 있도록 열어둠(없으면 빈배열)
	teamOptions?: readonly string[];
};

// dev 안전장치: publicId 문자열 보장 체크
function assertPublicId(id: unknown) {
	if (id != null && typeof id !== "string") {
		// eslint-disable-next-line no-console
		console.warn(
			"[MeetingEditorBody] meeting.id는 publicId 문자열이어야 합니다. 현재 타입:",
			typeof id,
			id
		);
	}
}

export default function MeetingEditorBody({
											  mode,
											  initial,
											  onSave,
											  onCancel,
											  teamOptions = [],
										  }: Props) {
	// ===== 좌측(콘텐츠) 상태 =====
	const [title, setTitle] = React.useState(initial.meeting.title || "");
	const [notes, setNotes] = React.useState(initial.meta.notes || "");
	const [links, setLinks] = React.useState<string[]>(initial.meta.links ?? []);
	const [linkOpen, setLinkOpen] = React.useState<boolean>(true);

	// ===== 우측(세부 정보) 상태 =====
	const [allDay, setAllDay] = React.useState(!!initial.meeting.allDay);
	const [start, setStart] = React.useState<Date>(new Date(initial.meeting.start));
	const [end, setEnd] = React.useState<Date>(new Date(initial.meeting.end));
	const [team, setTeam] = React.useState<string>(initial.meeting.team || "");
	const [location, setLocation] = React.useState(initial.meta.location || "");
	const [participants, setParticipants] = React.useState(initial.meta.participants || ""); // ", " 문자열

	// publicId 문자열 보장 체크(개발 편의)
	React.useEffect(() => {
		assertPublicId(initial.meeting.id);
	}, [initial.meeting.id]);

	// === 수동 저장 (버튼용) ===
	const handleSave = React.useCallback(() => {
		const metaToSave: MeetingMeta = {
			notes,
			location,
			participants,
			links,
		};

		onSave({
			meeting: {
				id: initial.meeting.id,
				title: title || "제목 없음",
				start,
				end,
				allDay,
				team,
			},
			meta: metaToSave,
		});
	}, [title, notes, links, location, participants, start, end, allDay, team, onSave, initial.meeting.id]);

	// === 자동 저장 (0.6초 디바운스) — 타이핑/선택이 멈추면 저장 ===
	const AUTOSAVE_MS = 600;
	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			const metaToSave: MeetingMeta = {
				notes,
				location,
				participants,
				links,
			};

			onSave({
				meeting: {
					id: initial.meeting.id,
					title: title || "제목 없음",
					start,
					end,
					allDay,
					team,
				},
				meta: metaToSave,
			});
		}, AUTOSAVE_MS);

		return () => window.clearTimeout(timer);
	}, [title, notes, links, location, participants, start, end, allDay, team, onSave, initial.meeting.id]);

	return (
		<div className="flex-1 min-h-0 px-6 pb-8">
			{/* 상단 우측 버튼 */}
			<div className="pt-5 pb-3 flex items-center justify-end">
				{onCancel && (
					<button className="h-8 px-3 rounded-md border mr-2" onClick={onCancel}>
						{mode === "new" ? "뒤로" : "뒤로"}
					</button>
				)}
				<button
					className="h-8 px-4 rounded-md bg-[#6D6CF8] text-white"
					onClick={handleSave}
					disabled={!title.trim()}
					title={!title.trim() ? "제목을 입력해 주세요." : "저장"}
				>
					저장
				</button>
			</div>

			{/* === 2열 레이아웃 === */}
			<div
				className="
          grid gap-6 items-start
          grid-cols-1
          lg:grid-cols-[minmax(0,1fr)_340px]
        "
			>
				{/* 왼쪽: 콘텐츠 */}
				<div className="min-w-0">
					<Content
						publicId={String(initial.meeting.id ?? "")}
						title={title} setTitle={setTitle}
						notes={notes} setNotes={setNotes}
						links={links} setLinks={setLinks}
						linkOpen={linkOpen} setLinkOpen={setLinkOpen}
						participants={participants}
					/>
				</div>

				{/* 오른쪽: 세부 정보 */}
				<div className="lg:sticky lg:top-16">
					<Details
						meetingId={initial.meeting.id ?? "new"}
						ownerId={""}                              // [CHANGED] 데모 사용자 제거 → 빈 문자열 전달(Details에서 옵션 처리되길 기대)
						allDay={allDay} setAllDay={setAllDay}
						start={start} setStart={setStart}
						end={end} setEnd={setEnd}
						team={team} setTeam={setTeam}
						teamOptions={teamOptions}
						location={location} setLocation={setLocation}
						participants={participants} setParticipants={setParticipants}
					/>
				</div>
			</div>
		</div>
	);
}