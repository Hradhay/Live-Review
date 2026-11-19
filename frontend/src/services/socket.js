import { io } from 'socket.io-client';
import { API_URL } from './api';

// One shared connection for the whole app.
const socket = io(API_URL);

export default socket;