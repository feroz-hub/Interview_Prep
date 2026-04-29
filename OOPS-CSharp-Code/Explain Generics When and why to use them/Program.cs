using System;

//Generics allows us to make classes and methods - Type independent or Type safe.
namespace Explain_Generics_When_and_why_to_use_them
{
    class Program
    {

        static void Main(string[] args)
        {
            //bool equal = Calculator.AreEqual(4, 4);
            //bool strEqual = Calculator.AreEqual("Interview", "Happy");

            bool equal = Calculator<int>.AreEqual(4, 4);

            bool strEqual = Calculator<string>.AreEqual("Interview", "Happy");

        }

    }

    public class Calculator<T>
    {
        public static bool AreEqual(T value1, T value2)
        {
            return value1.Equals(value2);
        }
    }

    //public class Calculator
    //{
    //    public static bool AreEqual<T>(T value1, T value2)
    //    {
    //        return value1.Equals(value2);
    //    }
    //}





    //public class Calculator
    //{
    //    public static bool AreEqual(int value1, int value2)
    //    {
    //        return value1.Equals(value2);
    //    }
    //}

    //public class Calculator
    //{
    //    public static bool AreEqual(object value1, object value2)
    //    {
    //        return value1.Equals(value2);
    //    }
    //}



}
