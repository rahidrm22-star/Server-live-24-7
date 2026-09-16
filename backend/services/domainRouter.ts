import { db } from '../db/index.ts';
import { ManagedDomain, Project } from '../types/index.ts';

class DomainRouterService {
  public getDomainListForUser(userId: string, isSuperAdmin: boolean = false): ManagedDomain[] {
    const all = db.getDomains();
    if (isSuperAdmin) return all;
    return all.filter(d => d.ownerId === userId);
  }

  public verifyCustomDomain(domainId: string, requestedBy: string): ManagedDomain {
    const domain = db.getDomains().find(d => d.id === domainId);
    if (!domain) throw new Error('Domain not found');

    // Simulate real DNS CNAME verification
    domain.status = 'ssl_active';
    domain.sslExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(); // 90 days
    db.save();

    db.addAuditLog({
      userId: requestedBy,
      action: 'DOMAIN_VERIFIED',
      category: 'system',
      details: { domainName: domain.domainName, status: domain.status }
    });

    return domain;
  }

  public getPublicUrl(project: Project, baseUrl: string = 'http://localhost:3000'): string {
    const custom = db.getDomains().find(d => d.projectId === project.id && (d.status === 'active' || d.status === 'ssl_active'));
    if (custom) {
      return `https://${custom.domainName}`;
    }
    // Subdomain routing format
    return `${baseUrl}/proxy/${project.subdomain}`;
  }

  public allocateInternalPort(): number {
    const projects = db.getProjects();
    const usedPorts = new Set(projects.map(p => p.assignedInternalPort));
    // range: 3100 to 9000
    for (let p = 3100; p < 9000; p++) {
      if (!usedPorts.has(p)) {
        return p;
      }
    }
    return Math.floor(9000 + Math.random() * 5000);
  }
}

export const domainRouter = new DomainRouterService();
