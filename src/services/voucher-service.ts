
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

  const totalCreditsRequired = creditsPerVoucher * numberOfVouchers;
  const currentTeacherCredits = typeof teacherProfile.credits === 'number' ? teacherProfile.credits : 0;

  // Admins have unlimited voucher generation
  if (!teacherProfile.isAdmin) {
    if (currentTeacherCredits < totalCreditsRequired) {
      throw new Error(`Insufficient credits. You need ${totalCreditsRequired} credits to generate these vouchers, but you only have ${currentTeacherCredits}.`);
    }
    
    // Deduct credits from the teacher if they are not an admin
    const newTeacherCreditAmount = currentTeacherCredits - totalCreditsRequired;
    try {
      await updateUserCredits(teacherId, newTeacherCreditAmount);
    } catch (error) {
      console.error(`Failed to deduct credits from teacher ${teacherId}:`, error);
      throw new Error("Failed to update teacher credits. Voucher generation aborted.");
    }
  }


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
      // Attempt to restore credits if code generation fails and user is not admin
      if (!teacherProfile.isAdmin) {
        await updateUserCredits(teacherId, currentTeacherCredits); // Restore to original amount
      }
      throw new Error(`Failed to generate a unique voucher code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts. ${!teacherProfile.isAdmin ? 'Teacher credits have been restored.' : ''}`);
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
      // Attempt to restore credits if save fails and user is not admin
       if (!teacherProfile.isAdmin) {
         await updateUserCredits(teacherId, currentTeacherCredits); // Restore to original amount
       }
      throw new Error(`Failed to save voucher ${voucherCode}. ${!teacherProfile.isAdmin ? 'Teacher credits have been restored.' : ''}`);
    }
  }
  console.log(`${createdVouchers.length} credit vouchers created by teacher ${teacherName} (${teacherId}). ${!teacherProfile.isAdmin ? totalCreditsRequired + ' credits deducted.' : 'Credits not deducted (Admin user).'}`);
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
    return { success: false, message: "User profile not found. Cannot verify enrollment." };
  }

  if (voucher.restrictedToClassId) {
    // Voucher is restricted to a specific class
    const studentEnrolledClassIds = userProfile.enrolledClassIds || {};
    if (!studentEnrolledClassIds[voucher.restrictedToClassId]) {
      return {
        success: false,
        message: `This voucher is restricted to students enrolled in the class: "${voucher.restrictedToClassName || voucher.restrictedToClassId}". To redeem this voucher, please ensure you are enrolled in this specific class.`
      };
    }
  } else {
    // Voucher is not restricted to a specific class, but to any class by the creating teacher
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

    return { success: true, message: `Successfully redeemed ${voucher.credits} credits!`, creditsAwarded: voucher.credits };
  } catch (error: any) {
    console.error("Error during voucher redemption process:", error);
    return { success: false, message: `Redemption failed due to a system error. Please try again later or contact support.` };
  }
}

