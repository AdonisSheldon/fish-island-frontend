import React, {useState, useRef, useEffect} from 'react';
import {Input, Button, Avatar, Tooltip, message, Popover, Spin} from 'antd';
import {SendOutlined, CrownFilled, MenuFoldOutlined, MenuUnfoldOutlined, SmileOutlined} from '@ant-design/icons';
import styles from './index.less';
import {useModel} from "@@/exports";
import {BACKEND_HOST_WS} from "@/constants";
import {getOnlineUserListUsingGet, listMessageVoByPageUsingPost} from "@/services/backend/chatController";

interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isAdmin: boolean;
  status?: string;
}

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [isUserListCollapsed, setIsUserListCollapsed] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const {initialState} = useModel('@@initialState');
  const {currentUser} = initialState || {};
  const [messageApi, contextHolder] = message.useMessage();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // 分页相关状态
  const [current, setCurrent] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const pageSize = 10;

  // 添加已加载消息ID的集合
  const [loadedMessageIds] = useState<Set<string>>(new Set());

  // 获取在线用户列表
  const fetchOnlineUsers = async () => {
    try {
      const response = await getOnlineUserListUsingGet();
      if (response.data) {
        const onlineUsersList = response.data.map(user => ({
          id: String(user.id),
          name: user.name || '未知用户',
          avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
          level: user.level || 1,
          isAdmin: user.isAdmin || false,
          status: '在线'
        }));

        // 如果当前用户已登录且不在列表中，将其添加到列表
        if (currentUser?.id && !onlineUsersList.some(user => user.id === String(currentUser.id))) {
          onlineUsersList.push({
            id: String(currentUser.id),
            name: currentUser.userName || '未知用户',
            avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
            level: 1,  // 默认等级为1
            isAdmin: currentUser.userRole === 'admin',
            status: '在线'
          });
        }

        setOnlineUsers(onlineUsersList);
      }
    } catch (error) {
      console.error('获取在线用户列表失败:', error);
      messageApi.error('获取在线用户列表失败');
    }
  };

  // 初始化时获取在线用户列表
  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  };
  const loadHistoryMessages = async (page: number, isFirstLoad = false) => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const response = await listMessageVoByPageUsingPost({
        current: page,
        pageSize,
        roomId: -1,
        sortField: 'createTime',
        sortOrder: 'desc'  // 保持降序，最新的消息在前面
      });
      if (response.data?.records) {
        const historyMessages = response.data.records
          .map(record => ({
            id: String(record.id),
            content: record.messageWrapper?.message?.content || '',
            sender: {
              id: String(record.userId),
              name: record.messageWrapper?.message?.sender?.name || '未知用户',
              avatar: record.messageWrapper?.message?.sender?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
              level: record.messageWrapper?.message?.sender?.level || 1,
              isAdmin: record.messageWrapper?.message?.sender?.isAdmin || false,
            },
            timestamp: new Date(record.messageWrapper?.message?.timestamp || Date.now()),
          }))
          // 过滤掉已经加载过的消息
          .filter(msg => !loadedMessageIds.has(msg.id));

        // 将新消息的ID添加到已加载集合中
        historyMessages.forEach(msg => loadedMessageIds.add(msg.id));

        // 处理历史消息，确保正确的时间顺序（旧消息在上，新消息在下）
        if (isFirstLoad) {
          // 首次加载时，反转消息顺序，使最旧的消息在上面
          setMessages(historyMessages.reverse());
        } else {
          // 加载更多历史消息时，新的历史消息应该在当前消息的上面
          // 只有在有新消息时才更新状态
          if (historyMessages.length > 0) {
            setMessages(prev => [...historyMessages.reverse(), ...prev]);
          }
        }

        setTotal(response.data.total || 0);

        // 更新是否还有更多消息
        // 考虑实际加载的消息数量，而不是页码计算
        const currentTotal = loadedMessageIds.size;
        setHasMore(currentTotal < (response.data.total || 0));

        // 只有在成功加载新消息时才更新页码
        if (historyMessages.length > 0) {
          setCurrent(page);
        }

        // 如果是首次加载，将滚动条设置到底部
        if (isFirstLoad) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    } catch (error) {
      messageApi.error('加载历史消息失败');
      console.error('加载历史消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查是否在底部附近
  const checkIfNearBottom = () => {
    const container = messageContainerRef.current;
    if (!container) return;

    const threshold = 100; // 距离底部100px以内都认为是在底部
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    setIsNearBottom(isNear);
  };

  // 监听滚动事件
  const handleScroll = () => {
    const container = messageContainerRef.current;
    if (!container || loading || !hasMore) return;

    // 检查是否在底部
    checkIfNearBottom();

    // 当滚动到顶部时加载更多
    if (container.scrollTop === 0) {
      // 更新当前页码，加载下一页
      const nextPage = current + 1;
      if (hasMore) {
        loadHistoryMessages(nextPage);
      }
    }
  };

  // 初始化时加载历史消息
  useEffect(() => {
    loadHistoryMessages(1, true);
  }, []);

  // 添加滚动监听
  useEffect(() => {
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore, current]);



  const handleSend = () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    const newMessage: Message = {
      id: `${Date.now()}`,
      content: inputValue,
      sender: {
        id: String(currentUser.id),
        name: currentUser.userName || '游客',
        avatar: currentUser.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor',
        level: 1,
        isAdmin: currentUser.userRole === 'admin',
      },
      timestamp: new Date(),
    };

    // 新发送的消息添加到列表末尾
    setMessages(prev => [...prev, newMessage]);
    // 更新总消息数和分页状态
    setTotal(prev => prev + 1);
    setHasMore(true); // 有新消息时重置hasMore状态

    // 发送消息到服务器
    const messageData = {
      type: 2,
      userId: -1,
      data: {
        type: 'chat',
        content: {
          message: newMessage
        }
      }
    };
    console.log('发送到服务器的数据:', messageData);
    ws.send(JSON.stringify(messageData));

    setInputValue('');
    // 发送消息后滚动到底部
    setTimeout(scrollToBottom, 100);
  };

  // 表情包数据
  const emojis = [
    '😊', '😂', '🤣', '❤️', '😍', '🥰', '😘', '😭', '😅', '😉',
    '🤔', '🤗', '🤫', '🤐', '😴', '🥱', '😪', '😇', '🥳', '😎',
    '🤓', '🧐', '🤠', '🤡', '🤑', '🤤', '😋', '😛', '😜', '😝',
    '🤪', '🤨', '🧐', '😤', '😠', '😡', '🤬', '😈', '👿', '👻',
    '💩', '🤡', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
  ];

  // WebSocket连接函数
  const connectWebSocket = () => {
    const token = localStorage.getItem('tokenValue');
    if (!token || !currentUser?.id) {
      messageApi.error('请先登录！');
      return;
    }

    const socket = new WebSocket(BACKEND_HOST_WS + token);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 1, // 登录连接
      }));
      console.log('WebSocket连接成功');
      setReconnectAttempts(0); // 重置重连次数
      // messageApi.success('连接成功！');
    };

    socket.onclose = () => {
      console.log('WebSocket连接关闭');
      setWs(null);

      // 如果重连次数未超过最大值，尝试重连
      if (reconnectAttempts < maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, timeout);
      } else {
        messageApi.error('连接失败，请刷新页面重试');
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('收到服务器消息:', data);
      if (data.type === 'chat') {
        console.log('处理聊天消息:', data.message);
        // 检查消息是否来自其他用户
        const otherUserMessage = data.data.message;
        console.log('otherUserMessage:', otherUserMessage);
        if (otherUserMessage.sender.id !== String(currentUser?.id)) {
          // 接收到的新消息添加到列表末尾
          setMessages(prev => [...prev, otherUserMessage]);
          // 更新总消息数
          setTotal(prev => prev + 1);
          // 如果用户正在查看底部，则自动滚动到底部
          if (isNearBottom) {
            setTimeout(scrollToBottom, 100);
          }
        }
      } else if (data.type === 'userOnline') {
        console.log('处理用户上线消息:', data.data);
        setOnlineUsers(prev => [
          ...prev,
          ...data.data.filter((newUser: { id: string; }) => !prev.some(user => user.id === newUser.id))
        ]);

      } else if (data.type === 'userOffline') {
        console.log('处理用户下线消息:', data.data);
        // 过滤掉下线的用户
        setOnlineUsers(prev => prev.filter(user => user.id !== data.data));
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket错误:', error);
      messageApi.error('连接发生错误');
    };

    // 定期发送心跳消息
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 4, // 心跳消息类型
        }));
      }
    }, 25000);

    setWs(socket);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.close();
    };
  };

  useEffect(() => {
    // 初始欢迎消息
    // const welcomeMessage: Message = {
    //   id: '1',
    //   content: '欢迎来到摸鱼聊天室！🎉 这里是一个充满快乐的地方~',
    //   sender: {
    //     id: 'admin',
    //     name: '摸鱼小助手',
    //     avatar: 'https://img1.baidu.com/it/u=2985996956,1440216669&fm=253&fmt=auto&app=120&f=GIF?w=285&h=285',
    //     level: 99,
    //     isAdmin: true,
    //   },
    //   timestamp: new Date(),
    // };
    // setMessages([welcomeMessage]);

    // 建立WebSocket连接
    const cleanup = connectWebSocket();

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentUser?.id]);

  const getLevelEmoji = (level: number) => {
    if (level >= 99) return '👑';
    if (level >= 50) return '🌟';
    if (level >= 30) return '💎';
    if (level >= 20) return '🌙';
    if (level >= 10) return '⭐';
    return '🌱';
  };

  const handleEmojiClick = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setIsEmojiPickerVisible(false);
  };

  const emojiPickerContent = (
    <div className={styles.emojiPicker}>
      {emojis.map((emoji, index) => (
        <span
          key={index}
          className={styles.emojiItem}
          onClick={() => handleEmojiClick(emoji)}
        >
          {emoji}
        </span>
      ))}
    </div>
  );

  return (
    <div className={`${styles.chatRoom} ${isUserListCollapsed ? styles.collapsed : ''}`}>
      {contextHolder}
      <div
        className={styles.messageContainer}
        ref={messageContainerRef}
        onScroll={handleScroll}
      >
        {loading && <div className={styles.loadingWrapper}><Spin /></div>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageItem} ${
              currentUser?.id && String(msg.sender.id) === String(currentUser.id) ? styles.self : ''
            }`}
          >
            <div className={styles.messageHeader}>
              <div className={styles.avatar}>
                <Tooltip title={`等级 ${msg.sender.level}`}>
                  <Avatar src={msg.sender.avatar} size={32}/>
                </Tooltip>
              </div>
              <div className={styles.senderInfo}>
                <span className={styles.senderName}>
                  {msg.sender.name}
                  {msg.sender.isAdmin && (
                    <CrownFilled className={styles.adminIcon}/>
                  )}
                  <span className={styles.levelBadge}>
                    {getLevelEmoji(msg.sender.level)} {msg.sender.level}
                  </span>
                </span>

              </div>
            </div>
            <div className={styles.messageContent}>{msg.content}</div>
            <span className={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
          </div>
        ))}
        <div ref={messagesEndRef}/>
      </div>

      <div className={styles.userList}>
        <div
          className={styles.collapseButton}
          onClick={() => setIsUserListCollapsed(!isUserListCollapsed)}
        >
          {isUserListCollapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
        </div>
        <div className={styles.userListHeader}>
          在线成员 ({onlineUsers.length})
        </div>
        {onlineUsers.map(user => (
          <div key={user.id} className={styles.userItem}>
            <Avatar src={user.avatar} size={28}/>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user.name}
                {user.isAdmin && <CrownFilled className={styles.adminIcon}/>}
              </div>
              <div className={styles.userStatus}>{user.status}</div>
            </div>
            <span className={styles.levelBadge}>
              {getLevelEmoji(user.level)}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.inputArea}>
        <Popover
          content={emojiPickerContent}
          trigger="click"
          visible={isEmojiPickerVisible}
          onVisibleChange={setIsEmojiPickerVisible}
          placement="topLeft"
          overlayClassName={styles.emojiPopover}
        >
          <Button
            icon={<SmileOutlined/>}
            className={styles.emojiButton}
          />
        </Popover>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入消息..."
          maxLength={200}
        />
        <span className={styles.inputCounter}>
          {inputValue.length}/200
        </span>
        <Button
          type="text"
          icon={<SendOutlined/>}
          onClick={handleSend}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default ChatRoom;
