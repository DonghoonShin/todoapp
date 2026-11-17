export async function fetchPublicIp() {
  const res = await fetch('https://api.ipify.org?format=json')
  if (!res.ok) throw new Error('IP 조회에 실패했습니다.')
  const data = await res.json()
  return data.ip
}
