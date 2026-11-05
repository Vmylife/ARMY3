// Only active for one official battle; never a saved weapon unlock.
export const TEMP_PISTOL_MAX_SHOTS=10;
export function needsTemporaryPistol(weapons={}){
 return (Number(weapons?.pistol)||0)<=0&&(Number(weapons?.rifle)||0)<=0;
}
