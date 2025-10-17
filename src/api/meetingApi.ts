import axiosInstance from './axiosInstance';

export type InternalId = number;
export type UUID = string;

// 생성
export interface CreateMeetingRequest {
    title: string;
    allDay: boolean;
    start: string | Date;
    end: string | Date;
    projectId?: number | null;
    participantAccountIds?: number[];
    teamIds?: number[];
}
export interface CreateMeetingResponse {
    publicId: UUID;
    meetingId: InternalId;
    title: string;
    createdAt: string;
}

// 수정
export interface UpdateMeetingRequest {
    title?: string;
    allDay?: boolean;
    start?: string | Date;
    end?: string | Date;
    teamIds?: number[];
    participantAccountIds?: number[];
    meetingVersion?: number;
    content?: string;
}
export interface UpdateMeetingResponse {
    publicId: UUID;
    meetingId: InternalId;
    meetingVersion?: number;
    noteVersion?: number;
}

// 단건 조회
export interface ReadMeetingResponse {
    publicId: UUID;
    meetingId: InternalId;
    title: string;
    allDay: boolean;
    start: string;
    end: string;

    creatorAccountId?: number;
    creatorNickname?: string;
    createdAt?: string;
    updatedAt?: string;

    // 상세/버전
    noteContent?: string;
    meetingVersion?: number;
    noteVersion?: number;

    // 참가자/팀 (서버가 map 리스트로 줌)
    participantList?: Array<Record<string, any>>;
    teamList?: Array<Record<string, any>>;
}

// 목록 조회
export interface MeetingListItem {
    meetingId: InternalId;
    publicId: UUID;
    title: string;
    allDay: boolean;
    start: string;
    end: string;
    creatorNickname?: string;
    updatedAt?: string;
    participantCount?: number;
}
export interface ListMeetingsResponse {
    items: MeetingListItem[];
    total: number;
    totalPages: number;
    page: number;
    perPage: number;
}

// 템플릿 타입
export interface MeetingTemplateColumn {
    key: string;
    label: string;
    badgeClass: string | null;
}
export interface MeetingTemplate {
    id: string;                   // e.g. "standup", "4ls"
    title: string;                // e.g. "데일리 스탠드업"
    columns: MeetingTemplateColumn[];
}

// api
export const meetingApi = {
    // 회의 생성
    createMeeting: async (data: CreateMeetingRequest): Promise<CreateMeetingResponse> => {
        const response = await axiosInstance.post('/meeting', data);
        return response.data as CreateMeetingResponse;
    },

    // 회의 수정 (publicId 기반)
    updateMeeting: async (publicId: string, data: UpdateMeetingRequest): Promise<UpdateMeetingResponse> => {
        const response = await axiosInstance.patch(`/meeting/${publicId}`, data);
        return response.data as UpdateMeetingResponse;
    },
    // 회의 삭제
    deleteMeeting: async (
        publicId: string,
        opts?: { ifMatch?: number | string }
    ): Promise<void> => {
        const headers: Record<string, string> = {};
        if (opts?.ifMatch !== undefined && opts?.ifMatch !== null) {
            const v = typeof opts.ifMatch === 'string' ? opts.ifMatch : String(opts.ifMatch);
            headers['If-Match'] = /^".*"$/.test(v) ? v : `"${v}"`;
        }
        await axiosInstance.delete(`/meeting/${publicId}`, { headers });
        // 204 No Content 이므로 반환 바디 없음
    },

    // 회의 단건 조회
    getMeetingDetail: async (publicId: string): Promise<ReadMeetingResponse> => {
        const response = await axiosInstance.get(`/meeting/${publicId}`);
        return response.data as ReadMeetingResponse;
    },

    // 회의 목록 조회
    // - 일반 리스트: page/perPage
    // - 캘린더 범위: from=YYYY-MM-DD, to=YYYY-MM-DD
    getMeetingList: async (params: { page?: number; perPage?: number; from?: string; to?: string }): Promise<ListMeetingsResponse> => {
        const response = await axiosInstance.get('/meeting', { params });
        return response.data as ListMeetingsResponse;
    },

    // 보드 조회
    async getMeetingBoard(publicId: string, ifNoneMatch?: string) {
        const res = await axiosInstance.get(`/meeting/${publicId}/board`, {
            headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : undefined,
            // fetch etag via res.headers.etag
            validateStatus: (s) => [200, 304, 404].includes(s),
        });
        return res; // {status, data?, headers}
    },

    // 보드 생성 및 수정
    async putMeetingBoard(publicId: string, body: { snapshot: any }) {
        return axiosInstance.put(`/meeting/${publicId}/board`, body);
    },

    // 템플릿 목록
    async getMeetingTemplateList(): Promise<MeetingTemplate[]> {
        const res = await axiosInstance.get("/meeting/template");
        return res.data as MeetingTemplate[];
    },

    // 템플릿 단건
    async getMeetingTemplate(id: string): Promise<MeetingTemplate> {
        const res = await axiosInstance.get(`/meeting/template/${id}`);
        return res.data as MeetingTemplate;
    },
};

export default meetingApi;
