// Risk service
export class RiskService {
  async checkRisk(order: any) {
    return { allowed: true }
  }
}

