// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 分页获取用户房间消息列表 POST /api/chat/message/page/vo */
export async function listMessageVoByPageUsingPost(
  body: API.MessageQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.BaseResponsePageRoomMessageVo_>('/api/chat/message/page/vo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取在线用户列表 GET /api/chat/online/user */
export async function getOnlineUserListUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListUserChatResponse_>('/api/chat/online/user', {
    method: 'GET',
    ...(options || {}),
  });
}
