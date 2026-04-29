using System;

//Q. What is the difference between “throw ex” and “throw”?
//Throw keyword preserve the whole stack trace and give more information about the error.
//But throw ex will give limited information about the error.
namespace Throw_ex__and__throw
{
    class Program
    {

        static void Main(string[] args)
        {
            try { 
                DivideZerobyZero();                
            }
            catch (Exception ex)  {
                Console.WriteLine(ex.StackTrace);
                Console.ReadLine();
            }
        }
        public static void DivideZerobyZero()
        {
            try {
                int i = 0, j = 0;
                int k = i / j;
            }
            catch (Exception ex) {
                throw ex;
            }
        }

    }
   
}

