import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  },
  block: {
    height: 100,
  },
  contracts: {},
};

// Mock contract functions
const generationVerification = {
  admin: mockClarity.tx.sender,
  generators: new Map(),
  generationRecords: new Map(),
  recordCounter: 0,
  
  registerGenerator(name, location, capacity) {
    if (mockClarity.tx.sender !== this.admin) {
      return { error: 403 };
    }
    
    this.generators.set(mockClarity.tx.sender, {
      name,
      location,
      capacity,
      verified: false
    });
    
    return { success: true };
  },
  
  verifyGenerator(generatorAddress) {
    if (mockClarity.tx.sender !== this.admin) {
      return { error: 403 };
    }
    
    if (!this.generators.has(generatorAddress)) {
      return { error: 404 };
    }
    
    const generator = this.generators.get(generatorAddress);
    generator.verified = true;
    this.generators.set(generatorAddress, generator);
    
    return { success: true };
  },
  
  recordGeneration(amount) {
    if (!this.generators.has(mockClarity.tx.sender)) {
      return { error: 404 };
    }
    
    const generator = this.generators.get(mockClarity.tx.sender);
    if (!generator.verified) {
      return { error: 403 };
    }
    
    const recordId = ++this.recordCounter;
    this.generationRecords.set(recordId, {
      generator: mockClarity.tx.sender,
      amount,
      timestamp: mockClarity.block.height,
      verified: false
    });
    
    return { success: true, recordId };
  },
  
  verifyGeneration(recordId) {
    if (mockClarity.tx.sender !== this.admin) {
      return { error: 403 };
    }
    
    if (!this.generationRecords.has(recordId)) {
      return { error: 404 };
    }
    
    const record = this.generationRecords.get(recordId);
    record.verified = true;
    this.generationRecords.set(recordId, record);
    
    return { success: true };
  },
  
  getGenerationRecord(recordId) {
    return this.generationRecords.get(recordId);
  },
  
  getGeneratorInfo(generatorAddress) {
    return this.generators.get(generatorAddress);
  },
  
  transferAdmin(newAdmin) {
    if (mockClarity.tx.sender !== this.admin) {
      return { error: 403 };
    }
    
    this.admin = newAdmin;
    return { success: true };
  }
};

describe('Generation Verification Contract', () => {
  beforeEach(() => {
    // Reset contract state
    generationVerification.admin = mockClarity.tx.sender;
    generationVerification.generators = new Map();
    generationVerification.generationRecords = new Map();
    generationVerification.recordCounter = 0;
  });
  
  it('should register a new generator', () => {
    const result = generationVerification.registerGenerator('Solar Farm', 'California', 1000);
    expect(result.success).toBe(true);
    
    const generator = generationVerification.getGeneratorInfo(mockClarity.tx.sender);
    expect(generator).toEqual({
      name: 'Solar Farm',
      location: 'California',
      capacity: 1000,
      verified: false
    });
  });
  
  it('should verify a generator', () => {
    generationVerification.registerGenerator('Solar Farm', 'California', 1000);
    const result = generationVerification.verifyGenerator(mockClarity.tx.sender);
    expect(result.success).toBe(true);
    
    const generator = generationVerification.getGeneratorInfo(mockClarity.tx.sender);
    expect(generator.verified).toBe(true);
  });
  
  it('should record energy generation', () => {
    generationVerification.registerGenerator('Solar Farm', 'California', 1000);
    generationVerification.verifyGenerator(mockClarity.tx.sender);
    
    const result = generationVerification.recordGeneration(500);
    expect(result.success).toBe(true);
    
    const record = generationVerification.getGenerationRecord(result.recordId);
    expect(record).toEqual({
      generator: mockClarity.tx.sender,
      amount: 500,
      timestamp: mockClarity.block.height,
      verified: false
    });
  });
  
  it('should verify energy generation record', () => {
    generationVerification.registerGenerator('Solar Farm', 'California', 1000);
    generationVerification.verifyGenerator(mockClarity.tx.sender);
    const { recordId } = generationVerification.recordGeneration(500);
    
    const result = generationVerification.verifyGeneration(recordId);
    expect(result.success).toBe(true);
    
    const record = generationVerification.getGenerationRecord(recordId);
    expect(record.verified).toBe(true);
  });
  
  it('should transfer admin rights', () => {
    const newAdmin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = generationVerification.transferAdmin(newAdmin);
    expect(result.success).toBe(true);
    expect(generationVerification.admin).toBe(newAdmin);
  });
  
  it('should prevent non-admin from registering generators', () => {
    // Change sender to non-admin
    const originalSender = mockClarity.tx.sender;
    mockClarity.tx.sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    const result = generationVerification.registerGenerator('Solar Farm', 'California', 1000);
    expect(result.error).toBe(403);
    
    // Restore sender
    mockClarity.tx.sender = originalSender;
  });
});
