
// src/services/voucher-service.ts
import { ref, get, set, update } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '@/lib/firebase';
import { generateVoucherCode } from '@/lib/voucherUtils';
import { addDays, formatISO, isPast, parseISO } from 'date-fns';
import { getUserProfile, updateUserCredits } from './user-service'; 
import { getAllClasses } from './class-service';

const database: Database = getDatabase(app);

export interface CreditVoucher {
  id: string; // The voucher code itself
  credits: number;
  generatedByTeacherId: string;
  generatedByTeacherName: string;
  createdAt: string; // ISO Timestamp
  expiryDate: string; // ISO Timestamp, 28 days from createdAt
  status: 'active' | 'redeemed' | 'expired';
  redeemedByUserId?: string;
  redeemedAt?: string; // ISO Timestamp
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
  numberOfVouchers: number
): Promise<CreditVoucher[]> {
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

  const currentTeacherCredits = typeof teacherProfile.credits === 'number' ? teacherProfile.credits : 0;
  const totalCreditsRequired = creditsPerVoucher * numberOfVouchers;

  if (currentTeacherCredits < totalCreditsRequired) {
    throw new Error(`Insufficient credits. You need ${totalCreditsRequired} credits to generate these vouchers, but you only have ${currentTeacherCredits}.`);
  }

  // Deduct credits from teacher FIRST
  const newTeacherCreditAmount = currentTeacherCredits - totalCreditsRequired;
  try {
    await updateUserCredits(teacherId, newTeacherCreditAmount);
  } catch (error) {
    console.error(`Failed to deduct credits from teacher ${teacherId}:`, error);
    throw new Error("Failed to update teacher credits. Voucher generation aborted.");
  }

  // If credit deduction was successful, proceed to generate vouchers
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
      // Potentially roll back teacher credit deduction if this fails, though complex.
      // For now, throw, indicating partial failure.
      await updateUserCredits(teacherId, currentTeacherCredits); // Attempt to roll back
      throw new Error(`Failed to generate a unique voucher code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts. Teacher credits have been restored.`);
    }

    const newVoucherData: CreditVoucher = {
      id: voucherCode,
      credits: creditsPerVoucher,
      generatedByTeacherId: teacherId,
      generatedByTeacherName: teacherName,
      createdAt: createdAtISO,
      expiryDate: expiryDateISO,
      status: 'active',
    };

    try {
      const voucherRef = ref(database, `creditVouchers/${voucherCode}`);
      await set(voucherRef, newVoucherData);
      createdVouchers.push(newVoucherData);
    } catch (error) {
      console.error(`Error saving voucher ${voucherCode}:`, error);
      // Potentially roll back teacher credit deduction and previously created vouchers in this batch.
      // For now, throw. Consider more robust transaction handling for production.
      await updateUserCredits(teacherId, currentTeacherCredits); // Attempt to roll back
      throw new Error(`Failed to save voucher ${voucherCode}. Teacher credits have been restored.`);
    }
  }
  console.log(`${createdVouchers.length} credit vouchers created by teacher ${teacherName} (${teacherId}). ${totalCreditsRequired} credits deducted.`);
  return createdVouchers;
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

export async function redeemVoucher(userId: string, voucherCodeInput: string): Promise<{ success: boolean; message: string; creditsAwarded?: number }> {
  const voucherCode = voucherCodeInput.toUpperCase(); // Ensure consistent case for lookup
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
    if (voucher.status !== 'expired') { // Mark as expired in DB if not already
      await update(voucherRef, { status: 'expired' });
    }
    return { success: false, message: "This voucher has expired." };
  }

  if (voucher.status !== 'active') {
    return { success: false, message: "This voucher is not currently active." };
  }

  // Check student's class enrollment against voucher's teacher
  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    return { success: false, message: "User profile not found. Cannot verify class enrollment." };
  }

  const studentEnrolledClassIds = Object.keys(userProfile.enrolledClassIds || {});
  if (studentEnrolledClassIds.length === 0) {
    return { success: false, message: "You must be enrolled in a class taught by the voucher's creator to redeem this voucher." };
  }

  const allClasses = await getAllClasses();
  const isEnrolledWithVoucherTeacher = studentEnrolledClassIds.some(enrolledClassId => {
    const classDetail = allClasses.find(cls => cls.id === enrolledClassId);
    return classDetail && classDetail.teacherId === voucher.generatedByTeacherId;
  });

  if (!isEnrolledWithVoucherTeacher) {
    return { success: false, message: "To redeem this voucher, you must be enrolled in a class taught by the teacher who created it." };
  }

  // All checks passed, proceed with redemption
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

    return { success: true, message: `Successfully redeemed ${voucher.credits} credits!`, creditsAwarded: voucher.credits };
  } catch (error: any) {
    console.error("Error during voucher redemption process:", error);
    return { success: false, message: `Redemption failed due to a system error. Please try again later or contact support.` };
  }
}
