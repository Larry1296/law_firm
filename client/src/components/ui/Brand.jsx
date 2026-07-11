import logo from '@/assets/images/logo.png';

export default function Brand({
  size = 'h-12 w-12',
  textSize = 'text-lg',
  showText = true,
}) {
  return (
    <div className='flex flex-col items-center justify-center text-center w-full'>
      <img
        src={logo}
        alt='Sheria Desk Logo'
        className={`${size} rounded-2xl object-cover`}
      />

      {showText && (
        <span className={`font-extrabold ${textSize} ${'text-yellow-600'}`}>
          Sheria Master
        </span>
      )}
    </div>
  );
}
