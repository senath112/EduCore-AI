
// src/services/voucher-service.ts
import { ref, get, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import { generateVoucherCode, generateBatchId } from '@/lib/voucherUtils';
import { addDays, formatISO, isPast, parseISO } from 'date-fns';
import { getUserProfile, updateUserCredits, enrollInClass } from './user-service';
import { getAllClasses } from './class-service';

const database: Database = getDatabase(app);

export interface CreditVoucher {
  id: string; // The voucher code itself
  batchId: string; // ID for the batch this voucher belongs to
  credits: number;
  generatedByTeacherId: string;
  generatedByTeacherName: string;
  createdAt: string; // ISO Timestamp
  expiryDate: string; // ISO Timestamp, 28 days from createdAt
  status: 'active' | 'redeemed' | 'expired';
  redeemedByUserId?: string;
  redeemedAt?: string; // ISO Timestamp
  restrictedToClassId?: string;
  restrictedToClassName?: string;
  restrictedToFriendlyClassId?: string;
}

export async function isVoucherCodeTaken(voucherCode: string): Promise<boolean> {
  const voucherRef = ref(database, `creditVouchers/${voucherCode}`);
  try {
    const snapshot = await get(voucherRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking if voucher code is taken:', error);
    throw error;
  }
}

export async function createCreditVouchers(
  teacherId: string,
  teacherName: string,
  creditsPerVoucher: number,
  numberOfVouchers: number,
  restrictedToClassId?: string,
  restrictedToClassName?: string,
  restrictedToFriendlyClassId?: string
): Promise<{ vouchers: CreditVoucher[]; batchId: string; }> {
  if (!teacherId || !teacherName) {
    throw new Error("Teacher information is required to generate vouchers.");
  }
  if (creditsPerVoucher <= 0 || numberOfVouchers <= 0) {
    throw new Error("Credits per voucher and number of vouchers must be positive integers.");
  }
  if (!Number.isInteger(creditsPerVoucher) || !Number.isInteger(numberOfVouchers)) {
    throw new Error("Credits and number of vouchers must be whole numbers.");
  }

  const teacherProfile = await getUserProfile(teacherId);
  if (!teacherProfile) {
    throw new Error("Teacher profile not found. Cannot verify or deduct credits.");
  }

  const totalCreditsRequired = creditsPerVoucher * numberOfVouchers;
  const currentTeacherCredits = typeof teacherProfile.credits === 'number' ? teacherProfile.credits : 0;
  const isTeacherAdmin = !!teacherProfile.isAdmin;

  if (!isTeacherAdmin) {
    if (currentTeacherCredits < totalCreditsRequired) {
      throw new Error(`Insufficient credits. You need ${totalCreditsRequired} credits to generate these vouchers, but you only have ${currentTeacherCredits}.`);
    }
    
    const newTeacherCreditAmount = currentTeacherCredits - totalCreditsRequired;
    try {
      await updateUserCredits(teacherId, newTeacherCreditAmount);
    } catch (error) {
      console.error(`Failed to deduct credits from teacher ${teacherId}:`, error);
      throw new Error("Failed to update teacher credits. Voucher generation aborted.");
    }
  }

  const batchIdentifier = generateBatchId();
  const createdVouchers: CreditVoucher[] = [];
  const MAX_CODE_GENERATION_ATTEMPTS = 10;

  const now = new Date();
  const createdAtISO = formatISO(now);
  const expiryDate = addDays(now, 28);
  const expiryDateISO = formatISO(expiryDate);

  for (let i = 0; i < numberOfVouchers; i++) {
    let voucherCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < MAX_CODE_GENERATION_ATTEMPTS) {
      voucherCode = generateVoucherCode();
      isUnique = !(await isVoucherCodeTaken(voucherCode));
      attempts++;
    }

    if (!isUnique) {
      if (!isTeacherAdmin) {
        await updateUserCredits(teacherId, currentTeacherCredits); 
      }
      throw new Error(`Failed to generate a unique voucher code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts. ${!isTeacherAdmin ? 'Teacher credits have been restored.' : ''}`);
    }

    const newVoucherData: CreditVoucher = {
      id: voucherCode,
      batchId: batchIdentifier,
      credits: creditsPerVoucher,
      generatedByTeacherId: teacherId,
      generatedByTeacherName: teacherName,
      createdAt: createdAtISO,
      expiryDate: expiryDateISO,
      status: 'active',
    };

    if (restrictedToClassId && restrictedToClassName) {
      newVoucherData.restrictedToClassId = restrictedToClassId;
      newVoucherData.restrictedToClassName = restrictedToClassName;
      if (restrictedToFriendlyClassId) {
        newVoucherData.restrictedToFriendlyClassId = restrictedToFriendlyClassId;
      }
    }

    try {
      const voucherRef = ref(database, `creditVouchers/${voucherCode}`);
      await set(voucherRef, newVoucherData);
      createdVouchers.push(newVoucherData);
    } catch (error) {
      console.error(`Error saving voucher ${voucherCode}:`, error);
       if (!isTeacherAdmin) {
         await updateUserCredits(teacherId, currentTeacherCredits);
       }
      throw new Error(`Failed to save voucher ${voucherCode}. ${!isTeacherAdmin ? 'Teacher credits have been restored.' : ''}`);
    }
  }
  console.log(`${createdVouchers.length} credit vouchers (Batch ID: ${batchIdentifier}) created by teacher ${teacherName} (${teacherId}). ${!isTeacherAdmin ? totalCreditsRequired + ' credits deducted.' : 'Credits not deducted (Admin user).'}`);
  return { vouchers: createdVouchers, batchId: batchIdentifier };
}

export async function getAllCreditVouchers(): Promise<CreditVoucher[]> {
  const vouchersRef = ref(database, 'creditVouchers');
  try {
    const snapshot = await get(vouchersRef);
    if (snapshot.exists()) {
      const vouchersData = snapshot.val();
      return Object.values(vouchersData as Record<string, CreditVoucher>)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('Error fetching all credit vouchers:', error);
    throw error;
  }
}

export async function redeemVoucher(userId: string, voucherCodeInput: string): Promise<{ success: boolean; message: string; creditsAwarded?: number, autoEnrolledClassId?: string }> {
  const voucherCode = voucherCodeInput.toUpperCase();
  const voucherRef = ref(database, `creditVouchers/${voucherCode}`);
  const voucherSnapshot = await get(voucherRef);

  if (!voucherSnapshot.exists()) {
    return { success: false, message: "Invalid voucher code." };
  }

  const voucher = voucherSnapshot.val() as CreditVoucher;

  if (voucher.status === 'redeemed') {
    return { success: false, message: "This voucher has already been redeemed." };
  }

  if (voucher.status === 'expired' || (voucher.expiryDate && isPast(parseISO(voucher.expiryDate)))) {
    if (voucher.status !== 'expired') {
      await update(voucherRef, { status: 'expired' });
    }
    return { success: false, message: "This voucher has expired." };
  }

  if (voucher.status !== 'active') {
    return { success: false, message: "This voucher is not currently active." };
  }

  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    return { success: false, message: "User profile not found. Cannot proceed with redemption." };
  }

  let autoEnrolledClassId: string | undefined = undefined;

  if (voucher.restrictedToClassId) {
    const studentEnrolledClassIds = userProfile.enrolledClassIds || {};
    if (!studentEnrolledClassIds[voucher.restrictedToClassId]) {
      // Attempt to auto-enroll
      try {
        await enrollInClass(userId, voucher.restrictedToClassId);
        console.log(`User ${userId} auto-enrolled in class ${voucher.restrictedToClassId} during voucher redemption.`);
        autoEnrolledClassId = voucher.restrictedToClassId;
      } catch (enrollError) {
        console.error(`Auto-enrollment failed for user ${userId} in class ${voucher.restrictedToClassId}:`, enrollError);
        return {
          success: false,
          message: `This voucher is for class "${voucher.restrictedToClassName || voucher.restrictedToClassId}". We tried to enroll you automatically, but it failed. Please try joining the class manually first, then redeem the voucher.`
        };
      }
    }
  } else {
    // Voucher not restricted to a specific class, but to any class by the creating teacher
    const studentEnrolledClassIds = Object.keys(userProfile.enrolledClassIds || {});
    if (studentEnrolledClassIds.length === 0) {
      return { success: false, message: `This voucher is for students of ${voucher.generatedByTeacherName}. You must be enrolled in one of their classes.` };
    }

    const allClasses = await getAllClasses();
    const isEnrolledWithVoucherTeacher = studentEnrolledClassIds.some(enrolledClassId => {
      const classDetail = allClasses.find(cls => cls.id === enrolledClassId);
      return classDetail && classDetail.teacherId === voucher.generatedByTeacherId;
    });

    if (!isEnrolledWithVoucherTeacher) {
      return { success: false, message: `To redeem this voucher, you must be enrolled in a class taught by ${voucher.generatedByTeacherName}.` };
    }
  }

  const currentCredits = userProfile.credits && typeof userProfile.credits === 'number' ? userProfile.credits : 0;
  const newCreditAmount = currentCredits + voucher.credits;

  try {
    await updateUserCredits(userId, newCreditAmount);

    const updatedVoucherData: Partial<CreditVoucher> = {
      status: 'redeemed',
      redeemedByUserId: userId,
      redeemedAt: new Date().toISOString(),
    };
    await update(voucherRef, updatedVoucherData);
    
    let successMessage = `Successfully redeemed ${voucher.credits} credits!`;
    if (autoEnrolledClassId && voucher.restrictedToClassName) {
        successMessage += ` You've also been automatically enrolled in the class: "${voucher.restrictedToClassName}".`;
    }

    return { success: true, message: successMessage, creditsAwarded: voucher.credits, autoEnrolledClassId };
  } catch (error: any) {
    console.error("Error during voucher redemption process:", error);
    return { success: false, message: `Redemption failed due to a system error. Please try again later or contact support.` };
  }
}
