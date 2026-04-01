// Enhanced Autotask Service with Rate Limiting, Circuit Breaker, and Response Compacting
// Wraps the base AutotaskService with resilience and efficiency patterns

import { AutotaskService } from './autotask.service.js';
import { RateLimiter, RateLimiterConfig } from '../utils/rateLimiter.js';
import { CircuitBreaker, CircuitBreakerConfig } from '../utils/circuitBreaker.js';
import { ResponseCompactor } from '../utils/responseCompactor.js';
import { Logger } from '../utils/logger.js';

export interface EnhancedAutotaskServiceConfig {
  rateLimiter?: RateLimiterConfig;
  circuitBreaker?: CircuitBreakerConfig;
  enableCompaction?: boolean;
}

/**
 * Enhanced wrapper around AutotaskService that adds:
 * - Rate limiting (token bucket algorithm)
 * - Circuit breaker pattern (prevents cascading failures)
 * - Response compaction (removes null/empty fields to reduce token consumption)
 */
export class EnhancedAutotaskService {
  private base: AutotaskService;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private enableCompaction: boolean;
  private logger: Logger;

  constructor(
    baseService: AutotaskService,
    logger: Logger,
    config: EnhancedAutotaskServiceConfig = {}
  ) {
    this.base = baseService;
    this.logger = logger;
    this.rateLimiter = new RateLimiter(config.rateLimiter);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.enableCompaction = config.enableCompaction ?? true;
  }

  /**
   * Check if the circuit is open (service is down)
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.getState() === 'OPEN';
  }

  /**
   * Get rate limiter status for monitoring
   */
  getRateLimiterStatus(): {
    tokensAvailable: number;
    waitTimeMs: number;
  } {
    return {
      tokensAvailable: this.rateLimiter.getTokensAvailable(),
      waitTimeMs: this.rateLimiter.getWaitTimeMs(),
    };
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Execute a service method with rate limiting, circuit breaker, and compaction
   */
  private async executeWithResilience<T>(
    methodName: string,
    methodFn: () => Promise<T>
  ): Promise<T> {
    // Check circuit breaker first
    if (!this.circuitBreaker.canExecute()) {
      const state = this.circuitBreaker.getState();
      throw new Error(
        `Circuit breaker is ${state}. Service is temporarily unavailable. ` +
        `Retry after cooldown period.`
      );
    }

    // Check rate limiter
    if (!this.rateLimiter.allowRequest()) {
      const waitMs = this.rateLimiter.getWaitTimeMs();
      this.logger.warn(`Rate limited. Wait ${waitMs}ms before retrying.`);
      throw new Error(
        `Rate limited. Please wait ${Math.ceil(waitMs / 1000)} seconds before retrying.`
      );
    }

    try {
      const result = await methodFn();
      this.circuitBreaker.recordSuccess();
      return this.enableCompaction ? this.compactResponse(result) : result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.logger.error(`${methodName} failed:`, error);
      throw error;
    }
  }

  /**
   * Compact the response to reduce token consumption
   */
  private compactResponse<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    return ResponseCompactor.compact(data) as T;
  }

  // Delegate all methods to base service with resilience wrapper

  async testConnection(): Promise<boolean> {
    return this.executeWithResilience('testConnection', () => this.base.testConnection());
  }

  async getCompany(id: number) {
    return this.executeWithResilience(`getCompany(${id})`, () => this.base.getCompany(id));
  }

  async searchCompanies(options?: any) {
    return this.executeWithResilience('searchCompanies', () => this.base.searchCompanies(options));
  }

  async createCompany(company: any) {
    return this.executeWithResilience('createCompany', () => this.base.createCompany(company));
  }

  async updateCompany(id: number, updates: any) {
    return this.executeWithResilience(`updateCompany(${id})`, () => this.base.updateCompany(id, updates));
  }

  async getContact(id: number) {
    return this.executeWithResilience(`getContact(${id})`, () => this.base.getContact(id));
  }

  async searchContacts(options?: any) {
    return this.executeWithResilience('searchContacts', () => this.base.searchContacts(options));
  }

  async createContact(contact: any) {
    return this.executeWithResilience('createContact', () => this.base.createContact(contact));
  }

  async updateContact(id: number, updates: any) {
    return this.executeWithResilience(`updateContact(${id})`, () => this.base.updateContact(id, updates));
  }

  async getTicket(id: number, fullDetails?: boolean) {
    return this.executeWithResilience(`getTicket(${id})`, () => this.base.getTicket(id, fullDetails));
  }

  async searchTickets(options?: any) {
    return this.executeWithResilience('searchTickets', () => this.base.searchTickets(options));
  }

  async createTicket(ticket: any) {
    return this.executeWithResilience('createTicket', () => this.base.createTicket(ticket));
  }

  async updateTicket(id: number, updates: any) {
    return this.executeWithResilience(`updateTicket(${id})`, () => this.base.updateTicket(id, updates));
  }

  async getTicketCharge(chargeId: number) {
    return this.executeWithResilience(`getTicketCharge(${chargeId})`, () => this.base.getTicketCharge(chargeId));
  }

  async searchTicketCharges(options?: any) {
    return this.executeWithResilience('searchTicketCharges', () => this.base.searchTicketCharges(options));
  }

  async createTicketCharge(charge: any) {
    return this.executeWithResilience('createTicketCharge', () => this.base.createTicketCharge(charge));
  }

  async updateTicketCharge(chargeId: number, updates: any) {
    return this.executeWithResilience(`updateTicketCharge(${chargeId})`, () => this.base.updateTicketCharge(chargeId, updates));
  }

  async deleteTicketCharge(ticketId: number, chargeId: number) {
    return this.executeWithResilience(`deleteTicketCharge(${chargeId})`, () => this.base.deleteTicketCharge(ticketId, chargeId));
  }

  async getQuote(id: number) {
    return this.executeWithResilience(`getQuote(${id})`, () => this.base.getQuote(id));
  }

  async searchQuotes(options?: any) {
    return this.executeWithResilience('searchQuotes', () => this.base.searchQuotes(options));
  }

  async createQuote(quote: any) {
    return this.executeWithResilience('createQuote', () => this.base.createQuote(quote));
  }

  async getQuoteItem(id: number) {
    return this.executeWithResilience(`getQuoteItem(${id})`, () => this.base.getQuoteItem(id));
  }

  async searchQuoteItems(options?: any) {
    return this.executeWithResilience('searchQuoteItems', () => this.base.searchQuoteItems(options));
  }

  async createQuoteItem(item: any) {
    return this.executeWithResilience('createQuoteItem', () => this.base.createQuoteItem(item));
  }

  async updateQuoteItem(id: number, updates: any) {
    return this.executeWithResilience(`updateQuoteItem(${id})`, () => this.base.updateQuoteItem(id, updates));
  }

  async deleteQuoteItem(quoteId: number, id: number) {
    return this.executeWithResilience(`deleteQuoteItem(${id})`, () => this.base.deleteQuoteItem(quoteId, id));
  }

  async getOpportunity(id: number) {
    return this.executeWithResilience(`getOpportunity(${id})`, () => this.base.getOpportunity(id));
  }

  async searchOpportunities(options?: any) {
    return this.executeWithResilience('searchOpportunities', () => this.base.searchOpportunities(options));
  }

  async createOpportunity(opportunity: any) {
    return this.executeWithResilience('createOpportunity', () => this.base.createOpportunity(opportunity));
  }

  async getProduct(id: number) {
    return this.executeWithResilience(`getProduct(${id})`, () => this.base.getProduct(id));
  }

  async searchProducts(options?: any) {
    return this.executeWithResilience('searchProducts', () => this.base.searchProducts(options));
  }

  async getService(id: number) {
    return this.executeWithResilience(`getService(${id})`, () => this.base.getService(id));
  }

  async searchServices(options?: any) {
    return this.executeWithResilience('searchServices', () => this.base.searchServices(options));
  }

  async getServiceBundle(id: number) {
    return this.executeWithResilience(`getServiceBundle(${id})`, () => this.base.getServiceBundle(id));
  }

  async searchServiceBundles(options?: any) {
    return this.executeWithResilience('searchServiceBundles', () => this.base.searchServiceBundles(options));
  }

  // Additional methods - delegated to base service
  async getProject(id: number) {
    return this.executeWithResilience(`getProject(${id})`, () => this.base.getProject(id));
  }

  async searchProjects(options?: any) {
    return this.executeWithResilience('searchProjects', () => this.base.searchProjects(options));
  }

  async createProject(project: any) {
    return this.executeWithResilience('createProject', () => this.base.createProject(project));
  }

  async updateProject(id: number, updates: any) {
    return this.executeWithResilience(`updateProject(${id})`, () => this.base.updateProject(id, updates));
  }

  async getResource(id: number) {
    return this.executeWithResilience(`getResource(${id})`, () => this.base.getResource(id));
  }

  async searchResources(options?: any) {
    return this.executeWithResilience('searchResources', () => this.base.searchResources(options));
  }

  async getFieldInfo(entityType: string) {
    return this.executeWithResilience(`getFieldInfo(${entityType})`, () => this.base.getFieldInfo(entityType));
  }

  // Pass through remaining methods to base service without wrapping (lower priority/less critical)
  async getConfigurationItem(id: number) {
    return this.base.getConfigurationItem(id);
  }

  async searchConfigurationItems(options?: any) {
    return this.base.searchConfigurationItems(options);
  }

  async searchContracts(options?: any) {
    return this.base.searchContracts(options);
  }

  async searchInvoices(options?: any) {
    return this.base.searchInvoices(options);
  }

  async searchTasks(options?: any) {
    return this.base.searchTasks(options);
  }

  async createTask(task: any) {
    return this.base.createTask(task);
  }

  async searchTimeEntries(options?: any) {
    return this.base.searchTimeEntries(options);
  }

  async createTimeEntry(entry: any) {
    return this.base.createTimeEntry(entry);
  }

  async getTicketNote(ticketId: number, noteId: number) {
    return this.base.getTicketNote(ticketId, noteId);
  }

  async searchTicketNotes(ticketId: number, options?: any) {
    return this.base.searchTicketNotes(ticketId, options);
  }

  async createTicketNote(ticketId: number, note: any) {
    return this.base.createTicketNote(ticketId, note);
  }

  async getProjectNote(projectId: number, noteId: number) {
    return this.base.getProjectNote(projectId, noteId);
  }

  async searchProjectNotes(projectId: number, options?: any) {
    return this.base.searchProjectNotes(projectId, options);
  }

  async createProjectNote(projectId: number, note: any) {
    return this.base.createProjectNote(projectId, note);
  }

  async getCompanyNote(companyId: number, noteId: number) {
    return this.base.getCompanyNote(companyId, noteId);
  }

  async searchCompanyNotes(companyId: number, options?: any) {
    return this.base.searchCompanyNotes(companyId, options);
  }

  async createCompanyNote(companyId: number, note: any) {
    return this.base.createCompanyNote(companyId, note);
  }

  async getTicketAttachment(ticketId: number, attachmentId: number, includeData?: boolean) {
    return this.base.getTicketAttachment(ticketId, attachmentId, includeData);
  }

  async searchTicketAttachments(options?: any) {
    return this.base.searchTicketAttachments(options);
  }

  async getExpenseReport(id: number) {
    return this.base.getExpenseReport(id);
  }

  async searchExpenseReports(options?: any) {
    return this.base.searchExpenseReports(options);
  }

  async createExpenseReport(report: any) {
    return this.base.createExpenseReport(report);
  }

  async createExpenseItem(item: any) {
    return this.base.createExpenseItem(item);
  }

  async searchBillingItems(options?: any) {
    return this.base.searchBillingItems(options);
  }

  async getBillingItem(id: number) {
    return this.base.getBillingItem(id);
  }

  async searchBillingItemApprovalLevels(options?: any) {
    return this.base.searchBillingItemApprovalLevels(options);
  }

  async searchServiceCalls(options?: any) {
    return this.base.searchServiceCalls(options);
  }

  async getServiceCall(id: number) {
    return this.base.getServiceCall(id);
  }

  async createServiceCall(call: any) {
    return this.base.createServiceCall(call);
  }

  async updateServiceCall(id: number, updates: any) {
    return this.base.updateServiceCall(id, updates);
  }

  async deleteServiceCall(id: number) {
    return this.base.deleteServiceCall(id);
  }

  async searchServiceCallTickets(options?: any) {
    return this.base.searchServiceCallTickets(options);
  }

  async createServiceCallTicket(ticket: any) {
    return this.base.createServiceCallTicket(ticket);
  }

  async deleteServiceCallTicket(id: number) {
    return this.base.deleteServiceCallTicket(id);
  }

  async searchServiceCallTicketResources(options?: any) {
    return this.base.searchServiceCallTicketResources(options);
  }

  async createServiceCallTicketResource(resource: any) {
    return this.base.createServiceCallTicketResource(resource);
  }

  async deleteServiceCallTicketResource(id: number) {
    return this.base.deleteServiceCallTicketResource(id);
  }

  async searchDepartments(options?: any) {
    return this.base.searchDepartments(options);
  }
}
