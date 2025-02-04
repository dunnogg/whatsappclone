import {useEffect, useState} from 'react';
import './App.css';
import {Form, Input, Button, Avatar} from 'antd';
import {DeleteOutlined, SendOutlined} from '@ant-design/icons';
import {
    deleteNotification,
    getAvatar,
    getChatHistory,
    getContacts,
    getMessages,
    getSettings,
    sendMessage
} from './api/api.ts';

interface Message {
    sender: string;
    text: string;
    timestamp?: number;
}

interface Chat {
    phone: string;
    lastMessage: string;
    timestamp: number;
    unread: number;
    avatar: string;
    name: string;
}

function App() {
    const [idInstance, setIdInstance] = useState('');
    const [apiTokenInstance, setApiTokenInstance] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string>('');
    const [newChatModalVisible, setNewChatModalVisible] = useState(false);
    const [newChatNumber, setNewChatNumber] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChats = chats.filter(chat => chat.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const [form] = Form.useForm();

    const onSubmit = async (data: any) => {
        setApiTokenInstance(data.apiTokenInstance);
        setIdInstance(data.idInstance);
        const settings = await getSettings(data.idInstance, data.apiTokenInstance);
        const avatar = await getAvatar(data.idInstance, data.apiTokenInstance, settings.wid)
        setUserAvatar(avatar.urlAvatar || './5907.jpg')
        setSubmitted(true);
    };
    const deleteChat = (phone: string) => {
        setChats(prevChats => prevChats.filter(chat => chat.phone !== phone));
        if (selectedChat === phone) setSelectedChat('');
    };

    const loadChat = async (phone: string) => {
        if (selectedChat === phone) return;
        const chatId = `${phone}@c.us`;
        const res = await getChatHistory(idInstance, apiTokenInstance, chatId);

        if (res) {
            const filteredMessages = res
                .filter((msg: any) => msg.typeMessage === "textMessage" || msg.typeMessage === "extendedTextMessage")
                .map((msg: any) => ({
                    sender: msg.type === "outgoing" ? "Me" : phone,
                    text: msg.typeMessage === "extendedTextMessage"
                        ? msg.extendedTextMessage.text
                        : msg.textMessage,
                    timestamp: msg.timestamp
                }))
                .reverse();
            const lastMsg = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1] : null;
            const contacts = await getContacts(idInstance, apiTokenInstance);
            if (contacts) {
                const user = contacts.find((contact: any) => contact.id === chatId);
                let nickname = phone;
                if (user) {
                    if (user.contactName) {
                        nickname = `${user.contactName} (+${phone})`;
                    } else if (user.name) {
                        nickname = `${user.name} (+${phone})`;
                    }
                }

                const avatar = await getAvatar(idInstance, apiTokenInstance, chatId);

                setChats(prevChats => prevChats.map(chat =>
                    chat.phone === phone
                        ? {
                            ...chat,
                            lastMessage: lastMsg ? lastMsg.text : '',
                            timestamp: lastMsg ? lastMsg.timestamp : chat.timestamp,
                            avatar: avatar.urlAvatar || './5907.jpg',
                            name: nickname
                        }
                        : chat
                ));
            }

            setMessages(filteredMessages);
            setSelectedChat(phone);
        }
    };


    const handleNewChat = () => {
        setNewChatModalVisible(true);
    };

    const startNewChat = () => {
        if (!newChatNumber.trim()) {
            alert('Please enter a valid phone number.');
            return;
        }

        if (newChatNumber) {
            setChats(prev => [
                ...prev,
                {
                    phone: newChatNumber,
                    lastMessage: '',
                    timestamp: Date.now(),
                    unread: 0,
                    avatar: 'default-avatar-url',
                    name: newChatNumber
                }
            ]);
            setNewChatNumber('');
            setNewChatModalVisible(false);
            loadChat(newChatNumber);
        }
    };

    const handleSendMessage = async () => {
        if (selectedChat && message) {
            await sendMessage(idInstance, apiTokenInstance, selectedChat, message);
            setMessages(prev => [...prev, {
                sender: 'Me',
                text: message,
                timestamp: Date.now()
            }]);
            setMessage('');
        }
    };

    useEffect(() => {
        if (!submitted || !selectedChat) return;

        const interval = setInterval(async () => {
            const res = await getMessages(idInstance, apiTokenInstance);
            if (res.data && res.data.body) {
                const {senderData, messageData, timestamp, typeWebhook} = res.data.body;

                if (!senderData || !senderData.sender) {
                    if (res.data.receiptId) {
                        await deleteNotification(idInstance, apiTokenInstance, res.data.receiptId);
                    }
                    return;
                }

                const phone = senderData.sender.split('@')[0];

                if (phone !== selectedChat) {
                    if (res.data.receiptId) {
                        await deleteNotification(idInstance, apiTokenInstance, res.data.receiptId);
                    }
                    return;
                }

                if (!messageData || (!messageData.textMessageData && !messageData.extendedTextMessageData)) return;

                const isOutgoing = typeWebhook === 'outgoingAPIMessageReceived';
                const text =
                    isOutgoing && messageData.extendedTextMessageData
                        ? messageData.extendedTextMessageData.textMessage
                        : messageData.textMessageData
                            ? messageData.textMessageData.textMessage
                            : '';

                if (!text) return;

                const newMessage = {
                    sender: isOutgoing ? 'Me' : phone,
                    text,
                    timestamp,
                };

                setMessages(prev => {
                    if (!prev.some(msg => msg.timestamp === newMessage.timestamp)) {
                        return [...prev, newMessage];
                    }
                    return prev;
                });

                setChats(prev =>
                    prev.map(chat =>
                        chat.phone === phone
                            ? {
                                ...chat,
                                lastMessage: text,
                                timestamp,
                                unread: isOutgoing ? chat.unread : chat.phone === selectedChat ? 0 : chat.unread + 1,
                            }
                            : chat
                    )
                );
                if (res.data.receiptId) {
                    await deleteNotification(idInstance, apiTokenInstance, res.data.receiptId);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedChat, submitted]);


    return (
        <div className="app-container">
            {!submitted && (
                <div className="auth-container">
                    <Form onFinish={onSubmit} form={form} className="login-form">
                        <Form.Item name="idInstance" required>
                            <Input placeholder="ID Instance" className='inputForm'/>
                        </Form.Item>
                        <Form.Item name="apiTokenInstance" required>
                            <Input placeholder="API Token Instance" className='inputForm'/>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" block className='primaryBtn'>
                                Login
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            )}

            {submitted && (
                <div className="main-container">
                    <div className="chat-list">
                        <div className="chat-list-header">
                            <Avatar size={40} src={userAvatar}/>
                            <div className="action-buttons">
                                <Button type="text" shape="circle" icon={<DeleteOutlined/>} onClick={() => deleteChat(selectedChat)}/>
                            </div>
                        </div>

                        <div className="search-container">
                            <Input
                                placeholder="Search or start new chat"
                                className='inputForm'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="chats">
                            {filteredChats.map(chat => (
                                <div
                                    key={chat.phone}
                                    className={`chat-item ${selectedChat === chat.phone ? 'active' : ''}`}
                                    onClick={() => loadChat(chat.phone)}
                                >
                                    <Avatar size={48} src={chat.avatar}/>
                                    <div className="chat-info">
                                        <div className="chat-header">
                                            <span
                                                className="name">{`${chat.name}`}</span>
                                            <span className="time">
                        {new Date(chat.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </span>
                                        </div>
                                        <div className="last-message">
                                            {chat.lastMessage || 'No messages yet'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="primary"
                            className='primaryBtn newChatBtn'
                            onClick={handleNewChat}
                        >
                            New Chat
                        </Button>
                    </div>

                    <div className="chat-container">
                        {selectedChat ? (
                            <>
                                <div className="chat-header rightAreaChatHeader">
                                    <Avatar size={40}
                                            src={chats.find((chat) => chat.phone === selectedChat)?.avatar}/> {/* Аватар активного чата */}
                                    <div className="chat-info">
                                        <div
                                            className="phone">{chats.find(chat => chat.phone === selectedChat)?.name || selectedChat}</div>
                                    </div>
                                </div>


                                <div className="messages-container">
                                    {messages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`message ${msg.sender === 'Me' ? 'sent' : 'received'}`}
                                        >
                                            <div className="message-content">
                                                <div className="text">{msg.text}</div>
                                                <div className="metadata">
                              <span className="time">
                                { msg?.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid timestamp' }
                              </span>

                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="message-input-container">
                                    <Input.TextArea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type a message"
                                        autoSize={{minRows: 1, maxRows: 4}}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="primary"
                                        shape="circle"
                                        icon={<SendOutlined/>}
                                        onClick={handleSendMessage}
                                        className="send-button"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="empty-chat">
                                Select a chat or start a new conversation
                            </div>
                        )}
                    </div>

                    {newChatModalVisible && (
                        <div className="new-chat-modal">
                            <div className="modal-content">
                                <h3>New Chat</h3>
                                <Input
                                    placeholder="Enter phone number"
                                    value={newChatNumber}
                                    onChange={(e) => setNewChatNumber(e.target.value)}
                                    className='inputForm'
                                />
                                <div className="modal-actions">
                                    <Button onClick={() => setNewChatModalVisible(false)} className='btn'>
                                        Cancel
                                    </Button>
                                    <Button type="primary" onClick={startNewChat} className='primaryBtn'>
                                        Start Chat
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
