// Real SMPP Integration Service using node-smpp library
// ESME Server Mode: Accepts connections from clients (they bind as ESME to us)
// ESME Client Mode: Connects to external SMPP servers / SMSCs (suppliers)

import smpp from 'smpp';

export interface SMPPBindConfig {
  host: string;
  port: number;
  systemId: string;
  password: string;
  systemType: string;
  bindMode: 'transceiver' | 'transmitter' | 'receiver';
  tps: number;
  interfaceVersion?: number;
  addressRange?: string;
}

export interface SMPPMessage {
  id: string;
  sourceAddr: string;
  destinationAddr: string;
  shortMessage: string;
  dataCoding: number;
  esmClass: number;
  registeredDelivery: number;
  messageId?: string;
  status: 'pending' | 'submitted' | 'delivered' | 'failed' | 'expired';
  submitTime: string;
  deliveryTime?: string;
  dlrStatus?: string;
  dlrTimestamp?: string;
  errorCode?: string;
  errorMessage?: string;
  clientId?: string;
  supplierId?: string;
  routeId?: string;
  trunkId?: string;
  mcc?: string;
  mnc?: string;
  rate?: number;
}

export interface DLRResult {
  messageId: string;
  dlrStatus: string;
  submitDate: string;
  doneDate: string;
  stat: 'DELIVRD' | 'UNDELIV' | 'EXPIRED' | 'DELETED' | 'REJECTD' | 'UNKNOWN';
  err: string;
  text: string;
}

// ==================== SMPP ESME Server ====================
// Listens for client connections (clients are ESMEs, we are SMSC)
export class SMPPServer {
  private server: smpp.Server;
  private sessions: Map<string, smpp.Session> = new Map();
  private messageHandlers: ((msg: SMPPMessage) => void)[] = [];

  constructor(private config: SMPPBindConfig) {
    this.server = smpp.createServer((session: smpp.Session) => {
      console.log(`[SMPP Server] New connection from ${session.socket.remoteAddress}`);
      
      session.on('bind_transceiver', (pdu: smpp.PDU) => {
        const { system_id, password } = pdu;
        console.log(`[SMPP Server] Bind request: system_id=${system_id}`);
        
        // Authenticate - check against database clients
        if (password === this.config.password) {
          session.send(pdu.response());
          this.sessions.set(system_id as string, session);
          console.log(`[SMPP Server] ${system_id} BOUND as transceiver`);
        } else {
          session.send(pdu.response({ command_status: smpp.STATUSES.ESME_RBINDFAIL }));
          console.log(`[SMPP Server] ${system_id} bind FAILED`);
        }
      });

      session.on('submit_sm', (pdu: smpp.PDU) => {
        const msg: SMPPMessage = {
          id: `SMPP_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
          sourceAddr: pdu.source_addr as string,
          destinationAddr: pdu.destination_addr as string,
          shortMessage: pdu.short_message?.message as string || '',
          dataCoding: pdu.data_coding as number,
          esmClass: pdu.esm_class as number,
          registeredDelivery: pdu.registered_delivery as number,
          status: 'submitted',
          submitTime: new Date().toISOString(),
          messageId: `MID_${Date.now()}`,
        };
        
        session.send(pdu.response({ message_id: msg.messageId }));
        this.messageHandlers.forEach(h => h(msg));
        console.log(`[SMPP Server] SMS: ${msg.sourceAddr} -> ${msg.destinationAddr}`);
      });

      session.on('unbind', (pdu: smpp.PDU) => {
        session.send(pdu.response());
        session.close();
      });

      session.on('error', (err: Error) => {
        console.error('[SMPP Server] Session error:', err.message);
      });

      session.on('close', () => {
        console.log('[SMPP Server] Session closed');
      });
    });
  }

  async start(): Promise<boolean> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`[SMPP Server] REAL SMPP listening on port ${this.config.port}`);
        resolve(true);
      });
    });
  }

  async stop(): Promise<void> {
    this.sessions.forEach(s => s.close());
    return new Promise(resolve => this.server.close(() => resolve()));
  }

  onMessage(handler: (msg: SMPPMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// ==================== SMPP ESME Client ====================
// Connects to external SMSCs (suppliers) as an ESME
export class SMPPClient {
  private session: smpp.Session | null = null;
  private isBound: boolean = false;
  private dlrCallbacks: Map<string, (dlr: DLRResult) => void> = new Map();
  private messageHandlers: ((msg: SMPPMessage) => void)[] = [];
  private consecutiveFailures: number = 0;
  private maxFailures: number = 20;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private config: SMPPBindConfig) {}

  async bind(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      try {
        console.log(`[SMPP Client] Connecting to ${this.config.host}:${this.config.port}`);
        
        this.session = smpp.connect({
          url: `smpp://${this.config.host}:${this.config.port}`,
          auto_start: false,
        });

        this.session.on('connect', () => {
          console.log(`[SMPP Client] TCP connected, sending bind_transceiver`);
          
          this.session!.bind_transceiver({
            system_id: this.config.systemId,
            password: this.config.password,
            system_type: this.config.systemType || 'SMPP',
            interface_version: this.config.interfaceVersion || 0x34,
            addr_ton: 0,
            addr_npi: 0,
            address_range: this.config.addressRange || '',
          }, (pdu: smpp.PDU) => {
            if (pdu.command_status === 0) {
              this.isBound = true;
              this.consecutiveFailures = 0;
              console.log(`[SMPP Client] BOUND to ${this.config.host}`);
              resolve({ success: true, message: 'Bound successfully' });
            } else {
              this.isBound = false;
              this.consecutiveFailures++;
              console.log(`[SMPP Client] Bind failed: status=${pdu.command_status}`);
              resolve({ success: false, message: `Bind failed: ${pdu.command_status}` });
            }
          });
        });

        this.session.on('error', (err: Error) => {
          console.error(`[SMPP Client] Error:`, err.message);
          this.isBound = false;
          this.consecutiveFailures++;
          resolve({ success: false, message: err.message });
        });

        this.session.on('close', () => {
          console.log('[SMPP Client] Connection closed');
          this.isBound = false;
        });

        this.session.on('deliver_sm', (pdu: smpp.PDU) => {
          // Handle incoming DLR
          const dlr: DLRResult = {
            messageId: (pdu.receipted_message_id as string) || '',
            dlrStatus: (pdu.message_state as string) || 'UNKNOWN',
            submitDate: '',
            doneDate: new Date().toISOString(),
            stat: (pdu.message_state as any) || 'UNKNOWN',
            err: '000',
            text: '',
          };
          
          const callback = this.dlrCallbacks.get(dlr.messageId);
          if (callback) {
            callback(dlr);
            this.dlrCallbacks.delete(dlr.messageId);
          }
          
          this.session!.send(pdu.response());
        });

      } catch (error) {
        resolve({ success: false, message: `Connection error: ${error}` });
      }
    });
  }

  async unbind(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.session) {
        resolve({ success: true });
        return;
      }
      this.session.unbind();
      this.session.close();
      this.isBound = false;
      resolve({ success: true });
    });
  }

  async submitMessage(msg: Omit<SMPPMessage, 'id' | 'status' | 'submitTime'>): Promise<SMPPMessage> {
    const fullMsg: SMPPMessage = {
      ...msg,
      id: `MSG_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
      status: 'pending',
      submitTime: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      if (!this.session || !this.isBound) {
        fullMsg.status = 'failed';
        fullMsg.errorMessage = 'Not bound to SMSC';
        resolve(fullMsg);
        return;
      }

      this.session.submit_sm({
        source_addr: msg.sourceAddr,
        destination_addr: msg.destinationAddr,
        short_message: msg.shortMessage,
        data_coding: msg.dataCoding || 0,
        registered_delivery: 1,
      }, (pdu: smpp.PDU) => {
        if (pdu.command_status === 0) {
          fullMsg.status = 'submitted';
          fullMsg.messageId = pdu.message_id as string;
          console.log(`[SMPP Client] SMS submitted: ${fullMsg.messageId}`);
          resolve(fullMsg);
        } else {
          fullMsg.status = 'failed';
          fullMsg.errorMessage = `Submit failed: ${pdu.command_status}`;
          resolve(fullMsg);
        }
      });
    });
  }

  onMessage(handler: (msg: SMPPMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  getBindStatus(): { isBound: boolean; failures: number; host: string; port: number } {
    return {
      isBound: this.isBound,
      failures: this.consecutiveFailures,
      host: this.config.host,
      port: this.config.port,
    };
  }

  shouldBlock(): boolean {
    return this.consecutiveFailures >= this.maxFailures;
  }
}

// ==================== SMPP Manager ====================
export class SMPPManager {
  private clients: Map<string, SMPPClient> = new Map();
  private servers: Map<string, SMPPServer> = new Map();

  createServer(id: string, config: SMPPBindConfig): SMPPServer {
    const server = new SMPPServer(config);
    this.servers.set(id, server);
    return server;
  }

  createClient(id: string, config: SMPPBindConfig): SMPPClient {
    const client = new SMPPClient(config);
    this.clients.set(id, client);
    return client;
  }

  async connectToSupplier(supplierId: string, host: string, port: number, systemId: string, password: string): Promise<{ success: boolean; message: string }> {
    const client = new SMPPClient({ host, port, systemId, password, systemType: 'SMPP', bindMode: 'transceiver', tps: 100 });
    const result = await client.bind();
    if (result.success) {
      this.clients.set(supplierId, client);
    }
    return result;
  }

  getClient(id: string): SMPPClient | undefined {
    return this.clients.get(id);
  }

  getServer(id: string): SMPPServer | undefined {
    return this.servers.get(id);
  }

  getAllClientStatus(): Array<{ id: string; bound: boolean; failures: number; host: string; port: number }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      ...client.getBindStatus(),
    }));
  }

  async disconnectAll(): Promise<void> {
    for (const [, client] of this.clients) {
      await client.unbind();
    }
    this.clients.clear();
  }
}

export const smppManager = new SMPPManager();
export default smppManager;
