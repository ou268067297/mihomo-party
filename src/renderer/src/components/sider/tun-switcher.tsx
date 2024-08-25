import { Button, Card, CardBody, CardFooter } from '@nextui-org/react'
import { useControledMihomoConfig } from '@renderer/hooks/use-controled-mihomo-config'
import BorderSwitch from '@renderer/components/base/border-swtich'
import { TbDeviceIpadHorizontalBolt } from 'react-icons/tb'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  encryptString,
  patchMihomoConfig,
  isEncryptionAvailable,
  restartCore
} from '@renderer/utils/ipc'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { platform } from '@renderer/utils/init'
import React, { useState } from 'react'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import BasePasswordModal from '../base/base-password-modal'

const TunSwitcher: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const match = location.pathname.includes('/tun') || false
  const [openPasswordModal, setOpenPasswordModal] = useState(false)
  const { appConfig, patchAppConfig } = useAppConfig()
  const { controledMihomoConfig, patchControledMihomoConfig } = useControledMihomoConfig(true)
  const { tun } = controledMihomoConfig || {}
  const { enable } = tun || {}
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: tf,
    transition,
    isDragging
  } = useSortable({
    id: 'tun'
  })
  const transform = tf ? { x: tf.x, y: tf.y, scaleX: 1, scaleY: 1 } : null
  const onChange = async (enable: boolean): Promise<void> => {
    if (enable && platform !== 'win32') {
      const encryptionAvailable = await isEncryptionAvailable()
      if (!appConfig?.encryptedPassword && encryptionAvailable) {
        setOpenPasswordModal(true)
        return
      }
      if (!appConfig?.encryptedPassword && !encryptionAvailable) {
        alert('加密不可用，请手动给内核授权')
        await patchAppConfig({ encryptedPassword: [] })
        return
      }
    }

    if (enable) {
      await patchControledMihomoConfig({ tun: { enable }, dns: { enable: true } })
    } else {
      await patchControledMihomoConfig({ tun: { enable } })
    }
    await patchMihomoConfig({ tun: { enable } })
    window.electron.ipcRenderer.send('updateTrayMenu')
  }

  return (
    <div
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 'calc(infinity)' : undefined
      }}
      className="col-span-1"
    >
      {openPasswordModal && (
        <BasePasswordModal
          onCancel={() => setOpenPasswordModal(false)}
          onConfirm={async (password: string) => {
            const encrypted = await encryptString(password)
            await patchAppConfig({ encryptedPassword: encrypted })
            await restartCore()
            setOpenPasswordModal(false)
          }}
        />
      )}

      <Card
        fullWidth
        className={`${match ? 'bg-primary' : ''}`}
        isPressable
        onPress={() => navigate('/tun')}
      >
        <CardBody className="pb-1 pt-0 px-0">
          <div ref={setNodeRef} {...attributes} {...listeners} className="flex justify-between">
            <Button
              isIconOnly
              className="bg-transparent pointer-events-none"
              variant="flat"
              color="default"
            >
              <TbDeviceIpadHorizontalBolt
                className={`${match ? 'text-white' : 'text-foreground'} text-[24px] font-bold`}
              />
            </Button>
            <BorderSwitch
              isShowBorder={match && enable}
              isSelected={enable}
              onValueChange={onChange}
            />
          </div>
        </CardBody>
        <CardFooter className="pt-1">
          <h3 className={`text-md font-bold ${match ? 'text-white' : 'text-foreground'}`}>
            虚拟网卡
          </h3>
        </CardFooter>
      </Card>
    </div>
  )
}

export default TunSwitcher
